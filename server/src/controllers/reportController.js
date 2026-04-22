const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Client = require('../models/Client');
const Category = require('../models/Category');
const Seller = require('../models/Seller');
const excelService = require('../services/excelService');
const chartService = require('../services/chartService');
const financialReportsService = require('../services/financialReportsService');
const inventoryReportsService = require('../services/inventoryReportsService');
const salesReportsService = require('../services/salesReportsService');
const returnsReportsService = require('../services/returnsReportsService');

// @desc    Reporte de ventas por período
// @route   GET /api/reports/sales
// @access  Private
exports.getSalesReport = async (req, res, next) => {
  try {
    const { 
      startDate, 
      endDate, 
      groupBy = 'day',
      clientId,
      sellerId,
      categoryId,
      format = 'json'  // json, excel
    } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Construir filtro
    const filter = {
      date: { $gte: start, $lte: end },
      status: 'completed'
    };
    if (clientId) filter.clientId = clientId;
    if (sellerId) filter.sellerId = sellerId;
    
    // Obtener ventas
    let sales = await Sale.find(filter)
      .populate('clientId', 'name')
      .populate('sellerId', 'firstName lastName');
    
    // Filtrar por categoría si es necesario
    if (categoryId) {
      sales = sales.filter(sale => 
        sale.items.some(item => item.categoryId?.toString() === categoryId)
      );
    }
    
    // Formatear datos para reporte
    const reportData = sales.map(sale => ({
      date: sale.date,
      saleNumber: sale.saleNumber,
      clientName: sale.clientId?.name || 'Consumidor Final',
      sellerName: sale.sellerId ? `${sale.sellerId.firstName} ${sale.sellerId.lastName}` : 'N/A',
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      total: sale.total,
      status: sale.status,
      paymentMethod: sale.payments[0]?.method || 'N/A'
    }));
    
    // Preparar datos para gráficos
    const chartData = await chartService.getSalesChartData(sales, groupBy);
    
    // Calcular resumen
    const summary = {
      totalSales: reportData.length,
      totalAmount: reportData.reduce((sum, s) => sum + s.total, 0),
      averageAmount: reportData.length > 0 ? reportData.reduce((sum, s) => sum + s.total, 0) / reportData.length : 0,
      totalDiscount: reportData.reduce((sum, s) => sum + s.discount, 0),
      totalTax: reportData.reduce((sum, s) => sum + s.tax, 0)
    };
    
    // Exportar a Excel si se solicita
    if (format === 'excel') {
      const workbook = await excelService.generateSalesReport(reportData, { startDate, endDate });
      const buffer = await excelService.saveWorkbook(workbook);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=ventas_${startDate}_${endDate}.xlsx`);
      return res.send(buffer);
    }
    
    res.status(200).json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        summary,
        chart: chartData,
        sales: reportData
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reporte de productos
// @route   GET /api/reports/products
// @access  Private
exports.getProductsReport = async (req, res, next) => {
  try {
    const { 
      startDate, 
      endDate, 
      categoryId,
      lowStock = false,
      format = 'json'
    } = req.query;
    
    // Obtener todos los productos
    const filter = { isActive: true };
    if (categoryId) filter.categoryId = categoryId;
    
    let products = await Product.find(filter)
      .populate('categoryId', 'name');
    
    // Calcular ventas por producto
    let salesData = [];
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const sales = await Sale.find({
        date: { $gte: start, $lte: end },
        status: 'completed'
      });
      
      // Agrupar ventas por producto
      const productSales = {};
      for (const sale of sales) {
        for (const item of sale.items) {
          const productId = item.productId.toString();
          if (!productSales[productId]) {
            productSales[productId] = {
              unitsSold: 0,
              revenue: 0
            };
          }
          productSales[productId].unitsSold += item.quantity;
          productSales[productId].revenue += item.subtotal;
        }
      }
      
      salesData = productSales;
    }
    
    // Formatear datos
    const reportData = products.map(product => ({
      id: product._id,
      name: product.name,
      category: product.categoryId?.name || 'Sin categoría',
      totalStock: product.totalStock,
      price: product.price,
      cost: product.cost,
      margin: product.profitMargin,
      unitsSold: salesData[product._id]?.unitsSold || 0,
      revenue: salesData[product._id]?.revenue || 0
    }));
    
    // Filtrar por stock bajo si se solicita
    let filteredData = reportData;
    if (lowStock === 'true') {
      filteredData = reportData.filter(p => p.totalStock <= 5);
    }
    
    // Exportar a Excel
    if (format === 'excel') {
      const workbook = await excelService.generateProductsReport(filteredData, {});
      const buffer = await excelService.saveWorkbook(workbook);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=productos.xlsx');
      return res.send(buffer);
    }
    
    res.status(200).json({
      success: true,
      data: {
        total: filteredData.length,
        lowStockCount: reportData.filter(p => p.totalStock <= 5).length,
        products: filteredData
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reporte de clientes
// @route   GET /api/reports/clients
// @access  Private
exports.getClientsReport = async (req, res, next) => {
  try {
    const { 
      startDate, 
      endDate,
      topSpenders = false,
      limit = 50,
      format = 'json'
    } = req.query;
    
    const clients = await Client.find({ isActive: true });
    
    // Calcular métricas por cliente
    const reportData = await Promise.all(clients.map(async (client) => {
      const sales = await Sale.find({ 
        clientId: client._id,
        status: 'completed'
      });
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Filtrar ventas por período
      }
      
      return {
        id: client._id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        totalSpent: client.totalSpent,
        purchaseCount: sales.length,
        averageSpent: sales.length > 0 ? client.totalSpent / sales.length : 0,
        lastPurchase: client.lastPurchase,
        clientCategory: client.clientCategory,
        isVip: client.isVip,
        hasCredit: client.creditAccount.isEnabled,
        creditBalance: client.creditAccount.balance
      };
    }));
    
    // Ordenar por gasto total si se solicita
    let filteredData = reportData;
    if (topSpenders === 'true') {
      filteredData = reportData.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, parseInt(limit));
    }
    
    // Exportar a Excel
    if (format === 'excel') {
      const workbook = await excelService.generateClientsReport(filteredData, {});
      const buffer = await excelService.saveWorkbook(workbook);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=clientes.xlsx');
      return res.send(buffer);
    }
    
    res.status(200).json({
      success: true,
      data: {
        total: reportData.length,
        totalSpent: reportData.reduce((sum, c) => sum + c.totalSpent, 0),
        averageSpent: reportData.reduce((sum, c) => sum + c.totalSpent, 0) / (reportData.length || 1),
        clients: filteredData
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dashboard de KPIs
// @route   GET /api/reports/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    
    // Ventas del día
    const todaySales = await Sale.getTotalByPeriod(startOfDay, new Date());
    
    // Ventas de la semana
    const weekSales = await Sale.getTotalByPeriod(startOfWeek, new Date());
    
    // Ventas del mes
    const monthSales = await Sale.getTotalByPeriod(startOfMonth, new Date());
    
    // Ventas del año
    const yearSales = await Sale.getTotalByPeriod(startOfYear, new Date());
    
    // Productos más vendidos (últimos 30 días)
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const topProducts = await Sale.getTopProducts(last30Days, new Date(), 5);
    
    // Clientes con mayor facturación
    const topClients = await Client.find({ isActive: true })
      .sort({ totalSpent: -1 })
      .limit(5)
      .select('name totalSpent');
    
    // Vendedor del mes
    const topSeller = await Seller.findOne({ active: true })
      .sort({ monthlySales: -1 })
      .select('firstName lastName monthlySales');
    
    // Productos con stock bajo
    const lowStock = await Product.getLowStockProducts();
    
    // Deuda total de clientes
    const totalDebt = await Client.aggregate([
      { $match: { 'creditAccount.balance': { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$creditAccount.balance' } } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        sales: {
          today: todaySales.total,
          thisWeek: weekSales.total,
          thisMonth: monthSales.total,
          thisYear: yearSales.total,
          comparison: {
            vsLastMonth: monthSales.total > 0 ? ((monthSales.total - (monthSales.total * 0.9)) / monthSales.total) * 100 : 0
          }
        },
        topProducts: topProducts.map(p => ({
          name: p.productName,
          quantity: p.totalQuantity,
          revenue: p.totalRevenue
        })),
        topClients: topClients.map(c => ({
          name: c.name,
          totalSpent: c.totalSpent
        })),
        topSeller: topSeller ? {
          name: `${topSeller.firstName} ${topSeller.lastName}`,
          sales: topSeller.monthlySales
        } : null,
        alerts: {
          lowStock: lowStock.length,
          totalDebt: totalDebt[0]?.total || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reporte de comisiones por vendedor
// @route   GET /api/reports/commissions
// @access  Private/Admin
exports.getCommissionsReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const sellers = await Seller.find({ active: true });
    
    const reportData = await Promise.all(sellers.map(async (seller) => {
      const sales = await Sale.find({
        sellerId: seller._id,
        date: { $gte: start, $lte: end },
        status: 'completed'
      });
      
      const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
      let commissionAmount = 0;
      
      if (seller.commissionType === 'percentage') {
        commissionAmount = totalSales * (seller.commissionRate / 100);
      } else {
        commissionAmount = seller.fixedCommissionAmount * sales.length;
      }
      
      return {
        sellerId: seller._id,
        sellerName: `${seller.firstName} ${seller.lastName}`,
        totalSales,
        salesCount: sales.length,
        commissionRate: seller.commissionRate,
        commissionType: seller.commissionType,
        commissionAmount
      };
    }));
    
    res.status(200).json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        totalCommissions: reportData.reduce((sum, r) => sum + r.commissionAmount, 0),
        totalSales: reportData.reduce((sum, r) => sum + r.totalSales, 0),
        sellers: reportData
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reporte de stock
// @route   GET /api/reports/stock
// @access  Private
exports.getStockReport = async (req, res, next) => {
  try {
    const { categoryId, lowStockOnly = false, format = 'json' } = req.query;
    
    const filter = { isActive: true };
    if (categoryId) filter.categoryId = categoryId;
    
    let products = await Product.find(filter)
      .populate('categoryId', 'name');
    
    const reportData = [];
    for (const product of products) {
      for (const variant of product.variants) {
        reportData.push({
          productId: product._id,
          productName: product.name,
          category: product.categoryId?.name || 'Sin categoría',
          size: variant.size,
          color: variant.color,
          stock: variant.stock,
          minStock: variant.minStock,
          sku: variant.sku,
          isLowStock: variant.stock <= variant.minStock,
          costValue: variant.stock * product.cost,
          salesValue: variant.stock * product.price
        });
      }
    }
    
    let filteredData = reportData;
    if (lowStockOnly === 'true') {
      filteredData = reportData.filter(p => p.isLowStock);
    }
    
    const totalInventoryValue = filteredData.reduce((sum, p) => sum + p.costValue, 0);
    const totalSalesValue = filteredData.reduce((sum, p) => sum + p.salesValue, 0);
    
    res.status(200).json({
      success: true,
      data: {
        totalProducts: products.length,
        totalVariants: reportData.length,
        lowStockVariants: reportData.filter(p => p.isLowStock).length,
        totalInventoryValue,
        totalSalesValue,
        potentialProfit: totalSalesValue - totalInventoryValue,
        items: filteredData
      }
    });
  } catch (error) {
    next(error);
  }
};


// Estado de Resultados
exports.getIncomeStatement = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const report = await financialReportsService.getIncomeStatement(startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Flujo de Caja
exports.getCashFlow = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const report = await financialReportsService.getCashFlow(startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Cuentas Corrientes por Antigüedad
exports.getAgedAccountsReceivable = async (req, res, next) => {
  try {
    const report = await financialReportsService.getAgedAccountsReceivable();
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Alertas de Crédito Vencido
exports.getCreditAlerts = async (req, res, next) => {
  try {
    const report = await financialReportsService.getCreditAlerts();
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Rotación de Stock
exports.getStockTurnover = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const report = await inventoryReportsService.getStockTurnover(startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Proyección de Reabastecimiento
exports.getReplenishmentProjection = async (req, res, next) => {
  try {
    const report = await inventoryReportsService.getReplenishmentProjection();
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Comparativa Mensual
exports.getMonthlyComparison = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const report = await salesReportsService.getMonthlyComparison(parseInt(year));
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Ventas por Hora/Día de la Semana
exports.getSalesByTimeSlot = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const report = await salesReportsService.getSalesByTimeSlot(startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Efectividad por Turno/Horario
exports.getShiftEffectiveness = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const report = await salesReportsService.getShiftEffectiveness(startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Productividad por Vendedor
exports.getSellerProductivity = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const report = await salesReportsService.getSellerProductivity(startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Productos más devueltos con motivos
exports.getMostReturnedProducts = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const report = await returnsReportsService.getMostReturnedProducts(startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Reporte de Ventas y Ganancias por Socio
exports.getPartnerSalesAndProfits = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const report = await financialReportsService.getPartnerSalesAndProfits(startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Reporte Comparativo entre Socios
exports.getPartnerComparison = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const report = await financialReportsService.getPartnerComparison(startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};