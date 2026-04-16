const Return = require('../models/Return');
const Product = require('../models/Product');

// Productos más devueltos con motivos
const getMostReturnedProducts = async (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const returns = await Return.find({
    date: { $gte: start, $lte: end },
    status: 'completed'
  }).populate('items.productId', 'name');
  
  // Agrupar por producto
  const productReturns = {};
  const reasonsSummary = {};
  
  for (const returnDoc of returns) {
    for (const item of returnDoc.items) {
      const productId = item.productId?._id || item.productId;
      const productName = item.productName;
      
      if (!productReturns[productId]) {
        productReturns[productId] = {
          productId,
          productName,
          totalQuantity: 0,
          totalRefund: 0,
          returnCount: 0,
          reasons: {}
        };
      }
      
      productReturns[productId].totalQuantity += item.quantity;
      productReturns[productId].totalRefund += item.refundAmount;
      productReturns[productId].returnCount += 1;
      
      // Contar por motivo
      const reason = returnDoc.reason;
      if (!productReturns[productId].reasons[reason]) {
        productReturns[productId].reasons[reason] = 0;
      }
      productReturns[productId].reasons[reason] += item.quantity;
      
      // Resumen global de motivos
      if (!reasonsSummary[reason]) {
        reasonsSummary[reason] = { count: 0, totalRefund: 0 };
      }
      reasonsSummary[reason].count += item.quantity;
      reasonsSummary[reason].totalRefund += item.refundAmount;
    }
  }
  
  // Calcular porcentajes y ordenar
  const totalReturned = Object.values(productReturns).reduce((sum, p) => sum + p.totalQuantity, 0);
  
  const productsList = Object.values(productReturns)
    .map(p => ({
      ...p,
      percentageOfTotal: totalReturned > 0 ? (p.totalQuantity / totalReturned) * 100 : 0,
      mainReason: Object.entries(p.reasons).sort((a, b) => b[1] - a[1])[0]?.[0]
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
  
  // Traducción de motivos
  const reasonLabels = {
    wrong_size: 'Talle incorrecto',
    wrong_color: 'Color incorrecto',
    defective: 'Producto defectuoso',
    damaged: 'Producto dañado',
    not_as_described: 'No coincide con descripción',
    change_of_mind: 'Cambio de opinión',
    other: 'Otro'
  };
  
  const reasonsList = Object.entries(reasonsSummary).map(([reason, data]) => ({
    reason: reasonLabels[reason] || reason,
    reasonCode: reason,
    count: data.count,
    totalRefund: data.totalRefund,
    percentage: totalReturned > 0 ? (data.count / totalReturned) * 100 : 0
  })).sort((a, b) => b.count - a.count);
  
  return {
    period: { startDate: start, endDate: end },
    summary: {
      totalReturns: returns.length,
      totalItemsReturned: totalReturned,
      totalRefundAmount: returns.reduce((sum, r) => sum + r.totalRefund, 0),
      averagePerReturn: returns.length > 0 ? returns.reduce((sum, r) => sum + r.totalRefund, 0) / returns.length : 0
    },
    byReason: reasonsList,
    topReturnedProducts: productsList.slice(0, 10),
    allProducts: productsList
  };
};

module.exports = {
  getMostReturnedProducts
};