const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Supplier = require('../models/Supplier');

// Rotación de Stock
const getStockTurnover = async (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const products = await Product.find({ isActive: true })
    .populate('categoryId', 'name');
  
  // Calcular ventas del período
  const sales = await Sale.find({
    date: { $gte: start, $lte: end },
    status: 'completed'
  });
  
  // Contar unidades vendidas por producto
  const unitsSold = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      const productId = item.productId.toString();
      unitsSold[productId] = (unitsSold[productId] || 0) + item.quantity;
    }
  }
  
  const reportData = [];
  for (const product of products) {
    const sold = unitsSold[product._id] || 0;
    const averageStock = product.totalStock;
    const turnoverRate = averageStock > 0 ? sold / averageStock : 0;
    const daysOfInventory = turnoverRate > 0 ? 365 / turnoverRate : 0;
    
    reportData.push({
      productId: product._id,
      productName: product.name,
      category: product.categoryId?.name || 'Sin categoría',
      currentStock: product.totalStock,
      unitsSold: sold,
      turnoverRate: turnoverRate.toFixed(2),
      daysOfInventory: Math.round(daysOfInventory),
      performance: turnoverRate > 12 ? 'Alta rotación' : turnoverRate > 6 ? 'Media rotación' : 'Baja rotación'
    });
  }
  
  // Resumen general
  const totalStock = reportData.reduce((sum, p) => sum + p.currentStock, 0);
  const totalSold = reportData.reduce((sum, p) => sum + p.unitsSold, 0);
  const globalTurnover = totalStock > 0 ? totalSold / totalStock : 0;
  
  return {
    period: { startDate: start, endDate: end },
    summary: {
      totalProducts: reportData.length,
      totalStock,
      totalSold,
      globalTurnoverRate: globalTurnover.toFixed(2),
      averageDaysOfInventory: reportData.reduce((sum, p) => sum + p.daysOfInventory, 0) / (reportData.length || 1)
    },
    products: reportData.sort((a, b) => parseFloat(b.turnoverRate) - parseFloat(a.turnoverRate))
  };
};

// Proyección de Reabastecimiento
const getReplenishmentProjection = async () => {
  const products = await Product.find({ isActive: true })
    .populate('supplierId', 'name deliveryTime');
  
  // Calcular ventas de los últimos 90 días para proyección
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const sales = await Sale.find({
    date: { $gte: ninetyDaysAgo },
    status: 'completed'
  });
  
  // Calcular promedio diario de ventas por producto
  const dailySales = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      const productId = item.productId.toString();
      dailySales[productId] = (dailySales[productId] || 0) + item.quantity;
    }
  }
  
  const projectionData = [];
  for (const product of products) {
    const totalSold90Days = dailySales[product._id] || 0;
    const avgDailySales = totalSold90Days / 90;
    
    // Calcular stock de seguridad (20% del promedio de ventas durante el lead time)
    const leadTimeDays = product.supplierId?.deliveryTime || 7;
    const safetyStock = Math.ceil(avgDailySales * leadTimeDays * 0.2);
    
    // Punto de pedido
    const reorderPoint = Math.ceil(avgDailySales * leadTimeDays) + safetyStock;
    
    // Días de stock restante
    const daysOfStockRemaining = avgDailySales > 0 ? product.totalStock / avgDailySales : 999;
    
    // Cantidad a pedir sugerida (para 30 días)
    const suggestedOrderQty = Math.ceil(avgDailySales * 30);
    
    let alertLevel = null;
    if (product.totalStock <= reorderPoint) {
      alertLevel = product.totalStock <= safetyStock ? 'critical' : 'warning';
    }
    
    projectionData.push({
      productId: product._id,
      productName: product.name,
      supplier: product.supplierId?.name || 'Sin proveedor',
      currentStock: product.totalStock,
      avgDailySales: avgDailySales.toFixed(2),
      leadTimeDays,
      safetyStock,
      reorderPoint,
      daysOfStockRemaining: Math.floor(daysOfStockRemaining),
      suggestedOrderQty,
      alertLevel,
      urgency: daysOfStockRemaining <= leadTimeDays ? 'Urgente' : 'Normal'
    });
  }
  
  return {
    generatedAt: new Date(),
    summary: {
      totalProducts: projectionData.length,
      productsNeedingReorder: projectionData.filter(p => p.alertLevel).length,
      urgentProducts: projectionData.filter(p => p.urgency === 'Urgente').length
    },
    products: projectionData.filter(p => p.alertLevel).sort((a, b) => a.daysOfStockRemaining - b.daysOfStockRemaining)
  };
};

module.exports = {
  getStockTurnover,
  getReplenishmentProjection
};