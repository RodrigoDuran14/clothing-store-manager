const Seller = require('../models/Seller');
const Sale = require('../models/Sale');

/**
 * Servicio para calcular comisiones de vendedores
 */

// Calcular comisión para una venta específica
const calculateSaleCommission = async (sellerId, saleAmount, saleDate = new Date()) => {
  const seller = await Seller.findById(sellerId);
  if (!seller) {
    throw new Error('Seller not found');
  }
  
  if (!seller.active) {
    throw new Error('Seller is inactive');
  }
  
  let commissionAmount = 0;
  
  // Calcular según el tipo de comisión
  if (seller.commissionType === 'percentage') {
    // Verificar si aplica escala por volumen
    if (seller.commissionTiers && seller.commissionTiers.length > 0) {
      // Buscar el tier que corresponde según las ventas totales del período
      const periodStart = new Date(saleDate.getFullYear(), saleDate.getMonth(), 1);
      const periodEnd = new Date(saleDate.getFullYear(), saleDate.getMonth() + 1, 0);
      
      const monthlySales = await Sale.aggregate([
        {
          $match: {
            sellerId: seller._id,
            date: { $gte: periodStart, $lte: periodEnd },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' }
          }
        }
      ]);
      
      const totalMonthlySales = monthlySales[0]?.total || 0;
      const projectedTotal = totalMonthlySales + saleAmount;
      
      const tier = seller.commissionTiers.find(
        t => projectedTotal >= t.minSales && (!t.maxSales || projectedTotal <= t.maxSales)
      );
      
      commissionAmount = saleAmount * (tier ? tier.rate : seller.commissionRate) / 100;
    } else {
      commissionAmount = saleAmount * seller.commissionRate / 100;
    }
  } else {
    // Comisión fija por venta
    commissionAmount = seller.fixedCommissionAmount;
  }
  
  return {
    sellerId: seller._id,
    sellerName: seller.fullName,
    saleAmount,
    commissionAmount,
    commissionRate: seller.commissionRate,
    commissionType: seller.commissionType
  };
};

// Calcular comisiones por período
const calculatePeriodCommissions = async (startDate, endDate) => {
  const commissions = await Seller.calculateCommissionsForPeriod(startDate, endDate);
  return commissions;
};

// Procesar pago de comisiones para un período
const processCommissionPayment = async (sellerId, period, amount, paymentReference) => {
  const seller = await Seller.findById(sellerId);
  if (!seller) {
    throw new Error('Seller not found');
  }
  
  const result = await seller.recordCommissionPayment(period, amount, paymentReference);
  
  return {
    sellerId: seller._id,
    sellerName: seller.fullName,
    period,
    amount,
    paymentReference,
    paidDate: new Date()
  };
};

// Obtener resumen de comisiones de un vendedor
const getSellerCommissionSummary = async (sellerId) => {
  const seller = await Seller.findById(sellerId)
    .populate('userId', 'name email');
  
  if (!seller) {
    throw new Error('Seller not found');
  }
  
  const pendingCommissions = seller.getPendingCommissions();
  const totalPending = pendingCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  
  // Obtener ventas del mes actual
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const monthlySales = await Sale.aggregate([
    {
      $match: {
        sellerId: seller._id,
        date: { $gte: startOfMonth },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$total' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    seller: {
      id: seller._id,
      name: seller.fullName,
      email: seller.email,
      position: seller.position,
      commissionRate: seller.commissionRate,
      commissionType: seller.commissionType
    },
    metrics: {
      totalSales: seller.totalSales,
      totalCommission: seller.totalCommission,
      monthlySales: monthlySales[0]?.total || 0,
      monthlySalesCount: monthlySales[0]?.count || 0,
      lastSaleDate: seller.lastSaleDate
    },
    commissions: {
      pending: pendingCommissions,
      totalPending,
      history: seller.commissionHistory.slice(-12) // Últimos 12 meses
    }
  };
};

// Generar reporte de comisiones por período
const generateCommissionReport = async (startDate, endDate) => {
  const commissions = await calculatePeriodCommissions(startDate, endDate);
  
  const totalSales = commissions.reduce((sum, c) => sum + c.totalSales, 0);
  const totalCommissions = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  
  return {
    period: {
      startDate,
      endDate
    },
    summary: {
      totalSellers: commissions.length,
      totalSales,
      totalCommissions,
      averageCommissionRate: totalSales > 0 ? (totalCommissions / totalSales) * 100 : 0
    },
    details: commissions.sort((a, b) => b.commissionAmount - a.commissionAmount)
  };
};

// Resetear métricas mensuales de todos los vendedores
const resetMonthlyMetrics = async () => {
  const result = await Seller.updateMany(
    { active: true },
    { monthlySales: 0 }
  );
  
  return {
    updated: result.nModified,
    message: 'Monthly metrics reset successfully'
  };
};

module.exports = {
  calculateSaleCommission,
  calculatePeriodCommissions,
  processCommissionPayment,
  getSellerCommissionSummary,
  generateCommissionReport,
  resetMonthlyMetrics
};