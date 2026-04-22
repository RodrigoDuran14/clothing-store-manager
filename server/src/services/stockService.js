const Product = require('../models/Product');

// Servicio para gestión de stock en ventas

// Verificar stock disponible para una venta
const checkStockForSale = async (items) => {
  const stockCheck = [];
  let hasStock = true;
  
  for (const item of items) {
    const product = await Product.findById(item.productId);
    
    if (!product) {
      return {
        hasStock: false,
        error: `Product not found: ${item.productId}`
      };
    }
    
    const variant = product.variants.find(
      v => v.size === item.size && v.color === item.color
    );
    
    if (!variant) {
      return {
        hasStock: false,
        error: `Variant not found for product ${product.name} - Size: ${item.size}, Color: ${item.color}`
      };
    }
    
    const available = variant.stock >= item.quantity;
    stockCheck.push({
      productId: product._id,
      productName: product.name,
      size: item.size,
      color: item.color,
      requested: item.quantity,
      available: variant.stock,
      hasStock: available
    });
    
    if (!available) hasStock = false;
  }
  
  return {
    hasStock,
    details: stockCheck
  };
};

// Descontar stock después de una venta
const deductStockForSale = async (items, saleId, session = null) => {
  const results = [];
  
  for (const item of items) {
    const product = await Product.findById(item.productId);
    
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }
    
    const updatedVariant = await product.updateStock(
      item.size,
      item.color,
      item.quantity,
      'sale'
    );
    
    results.push({
      productId: product._id,
      productName: product.name,
      size: item.size,
      color: item.color,
      previousStock: updatedVariant.stock + item.quantity,
      newStock: updatedVariant.stock,
      deducted: item.quantity
    });
  }
  
  return results;
};

// Restaurar stock al cancelar una venta
const restoreStockForCancellation = async (items, saleId, session = null) => {
  const results = [];
  
  for (const item of items) {
    const product = await Product.findById(item.productId);
    
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }
    
    const updatedVariant = await product.updateStock(
      item.size,
      item.color,
      item.quantity,
      'return'
    );
    
    results.push({
      productId: product._id,
      productName: product.name,
      size: item.size,
      color: item.color,
      previousStock: updatedVariant.stock - item.quantity,
      newStock: updatedVariant.stock,
      restored: item.quantity
    });
  }
  
  return results;
};

// Obtener resumen de stock después de venta
const getStockSummary = async (items) => {
  const summary = [];
  
  for (const item of items) {
    const product = await Product.findById(item.productId);
    
    if (product) {
      const variant = product.variants.find(
        v => v.size === item.size && v.color === item.color
      );
      
      summary.push({
        productId: product._id,
        productName: product.name,
        size: item.size,
        color: item.color,
        currentStock: variant?.stock || 0,
        minStock: variant?.minStock || 0,
        isLowStock: (variant?.stock || 0) <= (variant?.minStock || 0)
      });
    }
  }
  
  return summary;
};

module.exports = {
  checkStockForSale,
  deductStockForSale,
  restoreStockForCancellation,
  getStockSummary
};