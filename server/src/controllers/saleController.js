const Sale = require('../models/Sale');
const Client = require('../models/Client');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const stockService = require('../services/stockService');
const creditService = require('../services/creditService');
const commissionService = require('../services/commissionService');
const { filterObj, paginate, formatPagination } = require('../utils/helpers');

// @desc    Obtener todas las ventas
// @route   GET /api/sales
// @access  Private
exports.getSales = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      clientId,
      sellerId,
      status,
      paymentStatus,
      origin,
      minTotal,
      maxTotal,
      saleNumber,
      orderBy = 'date_desc'
    } = req.query;
    
    // Construir filtro
    const filter = {};
    
    if (clientId) filter.clientId = clientId;
    if (sellerId) filter.sellerId = sellerId;
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (origin) filter.origin = origin;
    if (saleNumber) filter.saleNumber = { $regex: saleNumber, $options: 'i' };
    
    // Filtro de fecha
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    // Filtro de total
    if (minTotal || maxTotal) {
      filter.total = {};
      if (minTotal) filter.total.$gte = parseFloat(minTotal);
      if (maxTotal) filter.total.$lte = parseFloat(maxTotal);
    }
    
    // Configurar ordenamiento
    let sort = {};
    switch(orderBy) {
      case 'date_asc':
        sort = { date: 1 };
        break;
      case 'date_desc':
        sort = { date: -1 };
        break;
      case 'total_asc':
        sort = { total: 1 };
        break;
      case 'total_desc':
        sort = { total: -1 };
        break;
      case 'saleNumber':
        sort = { saleNumber: 1 };
        break;
      default:
        sort = { date: -1 };
    }
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    const sales = await Sale.find(filter)
      .populate('clientId', 'name email phone')
      .populate('sellerId', 'firstName lastName')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitValue);
    
    // Agregar información virtual
    const salesWithVirtuals = sales.map(sale => ({
      ...sale.toObject(),
      paidAmount: sale.paidAmount,
      pendingBalance: sale.pendingBalance,
      paymentPercentage: sale.paymentPercentage
    }));
    
    const total = await Sale.countDocuments(filter);
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: salesWithVirtuals,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener venta por ID
// @route   GET /api/sales/:id
// @access  Private
exports.getSaleById = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('clientId', 'name email phone document addresses')
      .populate('sellerId', 'firstName lastName commissionRate')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('items.productId', 'name images variants');
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }
    
    // Agregar información virtual
    const saleData = {
      ...sale.toObject(),
      paidAmount: sale.paidAmount,
      pendingBalance: sale.pendingBalance,
      paymentPercentage: sale.paymentPercentage
    };
    
    res.status(200).json({
      success: true,
      data: saleData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener venta por número
// @route   GET /api/sales/number/:saleNumber
// @access  Private
exports.getSaleByNumber = async (req, res, next) => {
  try {
    const { saleNumber } = req.params;
    
    const sale = await Sale.findOne({ saleNumber })
      .populate('clientId', 'name email phone')
      .populate('sellerId', 'firstName lastName')
      .populate('items.productId', 'name images');
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...sale.toObject(),
        paidAmount: sale.paidAmount,
        pendingBalance: sale.pendingBalance
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear venta
// @route   POST /api/sales
// @access  Private/Admin
exports.createSale = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const {
      clientId,
      sellerId,
      items,
      discount = 0,
      tax = 0,
      payments = [],
      notes,
      origin = 'physical_store',
      shippingCost = 0,
      shippingAddress
    } = req.body;
    
    // 1. Validar cliente
    const client = await Client.findById(clientId);
    if (!client) {
      throw new Error('Client not found');
    }
    
    // 2. Validar vendedor
    const seller = await Seller.findById(sellerId);
    if (!seller || !seller.active) {
      throw new Error('Seller not found or inactive');
    }
    
    // 3. Verificar stock
    const stockCheck = await stockService.checkStockForSale(items);
    if (!stockCheck.hasStock) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock',
        details: stockCheck.details.filter(d => !d.hasStock)
      });
    }
    
    // 4. Calcular totales
    let subtotal = 0;
    const itemsWithDetails = [];
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      
      const unitPrice = product.price;
      const itemSubtotal = unitPrice * item.quantity;
      const itemDiscount = (itemSubtotal * (item.discount || 0)) / 100;
      const finalSubtotal = itemSubtotal - itemDiscount;
      
      subtotal += finalSubtotal;
      
      itemsWithDetails.push({
        productId: item.productId,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPrice,
        discount: itemDiscount,
        subtotal: finalSubtotal,
        productName: product.name,
        productSku: product.variants.find(v => v.size === item.size && v.color === item.color)?.sku
      });
    }
    
    const totalDiscount = discount;
    const finalTotal = subtotal - totalDiscount + tax + shippingCost;
    
    // 5. Verificar límite de crédito si usa cuenta corriente
    const usesCredit = payments.some(p => p.method === 'credit_account');
    if (usesCredit) {
      const creditCheck = client.checkCreditLimit(finalTotal);
      if (!creditCheck.allowed) {
        return res.status(400).json({
          success: false,
          message: creditCheck.message,
          data: {
            currentBalance: creditCheck.currentBalance,
            creditLimit: creditCheck.creditLimit,
            newBalance: creditCheck.newBalance
          }
        });
      }
    }
    
    // 6. Crear venta
    const sale = new Sale({
      clientId,
      sellerId,
      items: itemsWithDetails,
      subtotal,
      discount: totalDiscount,
      tax,
      total: finalTotal,
      payments,
      notes,
      origin,
      shippingCost,
      shippingAddress: shippingAddress || {},
      createdBy: req.user.id,
      status: payments.length > 0 ? 'completed' : 'pending',
      statusHistory: [{
        status: payments.length > 0 ? 'completed' : 'pending',
        note: 'Sale created',
        userId: req.user.id
      }]
    });
    
    await sale.save({ session });
    
    // 7. Descontar stock
    await stockService.deductStockForSale(items, sale._id, session);
    
    // 8. Registrar en cuenta corriente si aplica
    for (const payment of payments) {
      if (payment.method === 'credit_account') {
        await client.addCreditMovement(
          'purchase',
          payment.amount,
          `Purchase - Sale ${sale.saleNumber}`,
          sale._id,
          'Sale',
          req.user.id
        );
      }
    }
    
    // 9. Registrar en historial de compras del cliente
    const purchaseProducts = itemsWithDetails.map(item => ({
      productId: item.productId,
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal
    }));
    
    await client.addPurchaseToHistory(sale._id, finalTotal, purchaseProducts);
    
    // 10. Registrar comisión del vendedor
    const commission = await commissionService.calculateSaleCommission(
      sellerId,
      finalTotal,
      new Date()
    );
    
    await seller.recordSale(finalTotal, sale._id);
    
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      data: {
        ...sale.toObject(),
        paidAmount: sale.paidAmount,
        pendingBalance: sale.pendingBalance,
        commission
      },
      message: 'Sale created successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Agregar pago a venta existente
// @route   POST /api/sales/:id/payments
// @access  Private/Admin
exports.addPayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { method, amount, bankAccountId, reference, installments } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }
    
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }
    
    if (sale.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add payment to a cancelled sale'
      });
    }
    
    if (sale.pendingBalance < amount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount exceeds pending balance. Pending: ${sale.pendingBalance}`
      });
    }
    
    // Registrar pago
    const paymentData = {
      method,
      amount,
      bankAccountId,
      reference,
      installments: installments || 1,
      date: new Date()
    };
    
    const result = await sale.addPayment(paymentData, req.user.id);
    
    // Si es pago con cuenta corriente, registrar movimiento
    if (method === 'credit_account') {
      const client = await Client.findById(sale.clientId);
      if (client && client.creditAccount.isEnabled) {
        await client.addCreditMovement(
          'payment',
          amount,
          `Payment for sale ${sale.saleNumber}`,
          sale._id,
          'Sale',
          req.user.id
        );
      }
    }
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      data: {
        saleId: sale._id,
        saleNumber: sale.saleNumber,
        ...result
      },
      message: 'Payment added successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Cancelar venta
// @route   PUT /api/sales/:id/cancel
// @access  Private/Admin
exports.cancelSale = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { reason } = req.body;
    
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }
    
    if (!sale.canCancel()) {
      return res.status(400).json({
        success: false,
        message: 'This sale cannot be cancelled'
      });
    }
    
    // Cambiar estado
    await sale.changeStatus('cancelled', reason || 'Sale cancelled by user', req.user.id);
    
    // Restaurar stock
    const itemsToRestore = sale.items.map(item => ({
      productId: item.productId,
      size: item.size,
      color: item.color,
      quantity: item.quantity
    }));
    
    await stockService.restoreStockForCancellation(itemsToRestore, sale._id, session);
    
    // Si tenía pagos con cuenta corriente, revertir movimientos
    for (const payment of sale.payments) {
      if (payment.method === 'credit_account') {
        const client = await Client.findById(sale.clientId);
        if (client) {
          await client.addCreditMovement(
            'return',
            payment.amount,
            `Cancellation of sale ${sale.saleNumber}`,
            sale._id,
            'Sale',
            req.user.id
          );
        }
      }
    }
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      data: {
        saleId: sale._id,
        saleNumber: sale.saleNumber,
        status: sale.status,
        cancelledAt: new Date(),
        reason
      },
      message: 'Sale cancelled successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Obtener resumen de ventas por período
// @route   GET /api/sales/summary
// @access  Private
exports.getSalesSummary = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Total general
    const total = await Sale.getTotalByPeriod(start, end);
    
    // Ventas agrupadas
    let groupFormat;
    switch(groupBy) {
      case 'day':
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
        break;
      case 'month':
        groupFormat = { $dateToString: { format: '%Y-%m', date: '$date' } };
        break;
      case 'week':
        groupFormat = { $week: '$date' };
        break;
      default:
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
    }
    
    const groupedSales = await Sale.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: groupFormat,
          total: { $sum: '$total' },
          count: { $sum: 1 },
          average: { $avg: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Ventas por método de pago
    const paymentsByMethod = await Sale.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
          status: 'completed'
        }
      },
      { $unwind: '$payments' },
      {
        $group: {
          _id: '$payments.method',
          total: { $sum: '$payments.amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        totalSales: total.total,
        totalCount: total.count,
        averageSale: total.average,
        groupedBy: groupBy,
        groupedSales,
        paymentsByMethod
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener productos más vendidos
// @route   GET /api/sales/top-products
// @access  Private
exports.getTopProducts = async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const topProducts = await Sale.getTopProducts(start, end, parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: topProducts,
      period: { startDate: start, endDate: end }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Estadísticas de ventas
// @route   GET /api/sales/stats
// @access  Private
exports.getSaleStats = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Ventas de hoy
    const todaySales = await Sale.getTotalByPeriod(startOfDay, new Date());
    
    // Ventas de la semana
    const weekSales = await Sale.getTotalByPeriod(startOfWeek, new Date());
    
    // Ventas del mes
    const monthSales = await Sale.getTotalByPeriod(startOfMonth, new Date());
    
    // Ventas por estado
    const salesByStatus = await Sale.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Ventas por origen
    const salesByOrigin = await Sale.aggregate([
      { $group: { _id: '$origin', count: { $sum: 1 }, total: { $sum: '$total' } } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        today: {
          total: todaySales.total,
          count: todaySales.count,
          average: todaySales.average
        },
        thisWeek: {
          total: weekSales.total,
          count: weekSales.count,
          average: weekSales.average
        },
        thisMonth: {
          total: monthSales.total,
          count: monthSales.count,
          average: monthSales.average
        },
        salesByStatus,
        salesByOrigin
      }
    });
  } catch (error) {
    next(error);
  }
};