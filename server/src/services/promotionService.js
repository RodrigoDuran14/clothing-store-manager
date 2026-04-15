const Promotion = require('../models/Promotion');
const Product = require('../models/Product');

// Servicio para aplicar promociones a ventas

// Aplicar promociones a una venta
const applyPromotions = async (items, clientId = null, date = new Date()) => {
  // Obtener promociones activas
  const promotions = await Promotion.getActivePromotions(date);
  
  // Filtrar promociones aplicables
  const applicablePromotions = [];
  
  for (const promotion of promotions) {
    // Verificar límite de uso
    const limitCheck = promotion.checkUsageLimit(clientId);
    if (!limitCheck.valid) continue;
    
    // Verificar condiciones
    let conditionsMet = true;
    
    for (const condition of promotion.conditions) {
      switch (condition.type) {
        case 'min_purchase':
          const total = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
          if (condition.operator === 'gte' && total < condition.value) {
            conditionsMet = false;
          }
          break;
        case 'min_quantity':
          const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
          if (condition.operator === 'gte' && totalQuantity < condition.value) {
            conditionsMet = false;
          }
          break;
      }
      if (!conditionsMet) break;
    }
    
    if (conditionsMet) {
      applicablePromotions.push(promotion);
    }
  }
  
  // Ordenar por prioridad
  applicablePromotions.sort((a, b) => b.priority - a.priority);
  
  // Aplicar promociones
  let totalDiscount = 0;
  const appliedPromotions = [];
  const discountedItems = [];
  
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) continue;
    
    let bestDiscount = 0;
    let bestPromotion = null;
    
    for (const promotion of applicablePromotions) {
      // Verificar si el producto aplica
      const applies = Promotion.productApplies(promotion, product);
      
      if (applies) {
        // Verificar talle y color
        let sizeApplies = true;
        let colorApplies = true;
        
        if (promotion.applicableSizes && promotion.applicableSizes.length > 0) {
          sizeApplies = promotion.applicableSizes.includes(item.size);
        }
        
        if (promotion.applicableColors && promotion.applicableColors.length > 0) {
          colorApplies = promotion.applicableColors.includes(item.color);
        }
        
        if (sizeApplies && colorApplies) {
          const discountResult = promotion.calculateDiscount(
            product,
            item.quantity,
            item.unitPrice
          );
          
          if (discountResult.discount > bestDiscount) {
            bestDiscount = discountResult.discount;
            bestPromotion = promotion;
          }
        }
      }
    }
    
    if (bestDiscount > 0) {
      totalDiscount += bestDiscount;
      appliedPromotions.push({
        promotionId: bestPromotion._id,
        promotionName: bestPromotion.name,
        promotionCode: bestPromotion.code,
        productId: item.productId,
        productName: product.name,
        discount: bestDiscount,
        discountDescription: bestPromotion.benefits[0]?.description || ''
      });
      
      discountedItems.push({
        ...item,
        discountApplied: bestDiscount,
        finalPrice: (item.unitPrice * item.quantity) - bestDiscount
      });
      
      // Registrar uso de la promoción
      await bestPromotion.registerUsage(clientId);
    } else {
      discountedItems.push({
        ...item,
        discountApplied: 0,
        finalPrice: item.unitPrice * item.quantity
      });
    }
  }
  
  return {
    totalDiscount,
    appliedPromotions,
    discountedItems,
    promotionCount: appliedPromotions.length
  };
};

// Validar código de promoción
const validateCoupon = async (code, clientId = null, purchaseAmount = 0, date = new Date()) => {
  const promotion = await Promotion.getByCode(code, date);
  
  if (!promotion) {
    return { valid: false, message: 'Invalid or expired coupon code' };
  }
  
  if (promotion.type !== 'coupon') {
    return { valid: false, message: 'This code is not a coupon' };
  }
  
  // Verificar límite de uso
  const limitCheck = promotion.checkUsageLimit(clientId);
  if (!limitCheck.valid) {
    return { valid: false, message: limitCheck.reason };
  }
  
  // Verificar monto mínimo
  if (promotion.minPurchaseAmount > 0 && purchaseAmount < promotion.minPurchaseAmount) {
    return {
      valid: false,
      message: `Minimum purchase amount of $${promotion.minPurchaseAmount} required`
    };
  }
  
  // Calcular descuento
  let discountAmount = 0;
  let discountDescription = '';
  
  for (const benefit of promotion.benefits) {
    switch (benefit.type) {
      case 'percentage_discount':
        discountAmount = (purchaseAmount * benefit.value) / 100;
        discountDescription = `${benefit.value}% off`;
        break;
      case 'fixed_discount':
        discountAmount = benefit.value;
        discountDescription = `$${benefit.value} off`;
        break;
    }
  }
  
  // Aplicar límite máximo
  if (promotion.maxDiscountAmount && discountAmount > promotion.maxDiscountAmount) {
    discountAmount = promotion.maxDiscountAmount;
  }
  
  return {
    valid: true,
    promotion,
    discountAmount,
    discountDescription,
    finalAmount: purchaseAmount - discountAmount
  };
};

// Obtener promociones aplicables a un producto
const getProductPromotions = async (productId, size = null, color = null, date = new Date()) => {
  const product = await Product.findById(productId);
  if (!product) return [];
  
  const promotions = await Promotion.getActivePromotions(date);
  const applicablePromotions = [];
  
  for (const promotion of promotions) {
    const applies = Promotion.productApplies(promotion, product);
    
    if (applies) {
      let sizeApplies = true;
      let colorApplies = true;
      
      if (promotion.applicableSizes && promotion.applicableSizes.length > 0 && size) {
        sizeApplies = promotion.applicableSizes.includes(size);
      }
      
      if (promotion.applicableColors && promotion.applicableColors.length > 0 && color) {
        colorApplies = promotion.applicableColors.includes(color);
      }
      
      if (sizeApplies && colorApplies) {
        applicablePromotions.push({
          promotionId: promotion._id,
          name: promotion.name,
          description: promotion.description,
          type: promotion.type,
          benefits: promotion.benefits,
          endDate: promotion.endDate,
          discount: promotion.calculateDiscount(product, 1, product.price)
        });
      }
    }
  }
  
  return applicablePromotions;
};

// Obtener promociones destacadas (para mostrar en tienda)
const getFeaturedPromotions = async (limit = 5, date = new Date()) => {
  const promotions = await Promotion.find({
    isActive: true,
    startDate: { $lte: date },
    endDate: { $gte: date }
  })
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .select('name description type benefits startDate endDate code');
  
  return promotions;
};

module.exports = {
  applyPromotions,
  validateCoupon,
  getProductPromotions,
  getFeaturedPromotions
};