const Client = require('../models/Client');
const Sale = require('../models/Sale');

// Servicio para gestión de reembolsos en devoluciones

// Procesar reembolso según método
const processRefund = async (returnData, sale, client, session = null) => {
  const {
    refundMethod,
    refundDetails,
    totalRefund,
    returnId,
    saleId
  } = returnData;
  
  const results = {
    method: refundMethod,
    totalAmount: totalRefund,
    processed: false,
    details: {}
  };
  
  switch (refundMethod) {
    case 'credit_account':
      // Reembolsar a cuenta corriente del cliente
      if (client && client.creditAccount.isEnabled) {
        await client.addCreditMovement(
          'return',
          totalRefund,
          `Return from sale ${sale.saleNumber} - Return ${returnData.returnNumber}`,
          returnId,
          'Return',
          returnData.processedBy
        );
        results.processed = true;
        results.details.creditAccountAmount = totalRefund;
      }
      break;
      
    case 'voucher':
      // Generar vale de compra
      const voucherCode = generateVoucherCode();
      const voucherExpiryDate = new Date();
      voucherExpiryDate.setMonth(voucherExpiryDate.getMonth() + 6); // 6 meses de validez
      
      results.processed = true;
      results.details.voucherCode = voucherCode;
      results.details.voucherAmount = totalRefund;
      results.details.voucherExpiryDate = voucherExpiryDate;
      break;
      
    case 'cash':
    case 'credit_card':
    case 'transfer':
      // Para estos métodos, el reembolso se procesa externamente
      results.processed = true;
      results.details[`${refundMethod}Amount`] = totalRefund;
      results.details.reference = refundDetails?.reference || null;
      break;
      
    default:
      throw new Error(`Unsupported refund method: ${refundMethod}`);
  }
  
  return results;
};

// Generar código de vale único
const generateVoucherCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'VCH-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Validar que la devolución sea válida (dentro del período)
const validateReturnPeriod = (saleDate, daysLimit = 30) => {
  const today = new Date();
  const saleDateObj = new Date(saleDate);
  const diffTime = Math.abs(today - saleDateObj);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    isValid: diffDays <= daysLimit,
    daysSinceSale: diffDays,
    daysRemaining: Math.max(0, daysLimit - diffDays)
  };
};

// Calcular monto a reembolsar basado en los items devueltos
const calculateRefundAmount = (items, saleItems) => {
  let totalRefund = 0;
  const refundItems = [];
  
  for (const returnItem of items) {
    // Encontrar el item original en la venta
    const originalItem = saleItems.find(
      item => item.productId.toString() === returnItem.productId &&
              item.size === returnItem.size &&
              item.color === returnItem.color
    );
    
    if (originalItem) {
      const refundAmount = originalItem.subtotal * (returnItem.quantity / originalItem.quantity);
      totalRefund += refundAmount;
      
      refundItems.push({
        ...returnItem,
        refundAmount,
        unitPrice: originalItem.unitPrice
      });
    }
  }
  
  return {
    totalRefund,
    items: refundItems
  };
};

// Actualizar estado de la venta original después de devolución
const updateSaleAfterReturn = async (saleId, returnAmount, session = null) => {
  const sale = await Sale.findById(saleId);
  
  if (!sale) {
    throw new Error('Sale not found');
  }
  
  // Marcar la venta como parcialmente devuelta o totalmente devuelta
  if (sale.total === returnAmount) {
    sale.status = 'refunded';
  } else {
    sale.status = 'partially_refunded';
  }
  
  await sale.save({ session });
  
  return sale;
};

// Verificar si un producto puede ser devuelto
const canReturnProduct = (product, originalSaleDate, daysLimit = 30) => {
  const periodCheck = validateReturnPeriod(originalSaleDate, daysLimit);
  
  if (!periodCheck.isValid) {
    return {
      canReturn: false,
      reason: `Return period expired. Days since sale: ${periodCheck.daysSinceSale}, limit: ${daysLimit}`
    };
  }
  
  return {
    canReturn: true,
    reason: null
  };
};

module.exports = {
  processRefund,
  generateVoucherCode,
  validateReturnPeriod,
  calculateRefundAmount,
  updateSaleAfterReturn,
  canReturnProduct
};