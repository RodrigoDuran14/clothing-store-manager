const mongoose = require('mongoose');

// Esquema para condiciones de la promoción
const conditionSchema = new mongoose.Schema({
  type: {  // Tipo de condición
    type: String,
    enum: ['min_purchase', 'min_quantity', 'specific_products', 'specific_categories', 'specific_sizes', 'specific_colors'],
    required: true
  },
  value: {  // Valor de la condición
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  operator: {  // Operador de comparación
    type: String,
    enum: ['gte', 'lte', 'eq', 'in'],
    default: 'eq'
  }
});

// Esquema para beneficios de la promoción
const benefitSchema = new mongoose.Schema({
  type: {  // Tipo de beneficio
    type: String,
    enum: ['percentage_discount', 'fixed_discount', 'buy_x_get_y', 'free_shipping', 'gift_product'],
    required: true
  },
  value: {  // Valor del beneficio
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {  // Descripción del beneficio
    type: String,
    trim: true
  }
});

// Esquema para productos aplicables
const applicableProductSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  includeAll: {  // Si aplica a todos los productos
    type: Boolean,
    default: false
  },
  excludedProducts: [{  // Productos excluidos
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]
});

// Esquema para categorías aplicables
const applicableCategorySchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  includeAll: {  // Si aplica a todas las categorías
    type: Boolean,
    default: false
  },
  excludedCategories: [{  // Categorías excluidas
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }]
});

const promotionSchema = new mongoose.Schema({
  name: {  // Nombre de la promoción
    type: String,
    required: [true, 'Promotion name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {  // Descripción de la promoción
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  code: {  // Código de promoción (opcional, para cupones)
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z0-9]{3,20}$/, 'Code must be 3-20 alphanumeric characters']
  },
  type: {  // Tipo de promoción
    type: String,
    enum: ['automatic', 'coupon', 'seasonal', 'flash_sale', 'bundle'],
    required: true,
    default: 'automatic'
  },
  conditions: [conditionSchema],  // Condiciones para aplicar
  benefits: [benefitSchema],  // Beneficios de la promoción
  applicableProducts: applicableProductSchema,  // Productos donde aplica
  applicableCategories: applicableCategorySchema,  // Categorías donde aplica
  applicableSizes: [{  // Talles donde aplica
    type: String,
    uppercase: true,
    trim: true
  }],
  applicableColors: [{  // Colores donde aplica
    type: String,
    trim: true
  }],
  minPurchaseAmount: {  // Monto mínimo de compra
    type: Number,
    min: 0,
    default: 0
  },
  maxDiscountAmount: {  // Monto máximo de descuento
    type: Number,
    min: 0,
    default: null
  },
  usageLimit: {  // Límite de usos totales
    type: Number,
    min: 0,
    default: null
  },
  usageLimitPerCustomer: {  // Límite de usos por cliente
    type: Number,
    min: 0,
    default: null
  },
  usedCount: {  // Contador de usos
    type: Number,
    default: 0
  },
  customerUsage: [{  // Usos por cliente
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    count: { type: Number, default: 0 },
    lastUsed: Date
  }],
  startDate: {  // Fecha de inicio
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {  // Fecha de fin
    type: Date,
    required: [true, 'End date is required']
  },
  isActive: {  // Si está activa
    type: Boolean,
    default: true
  },
  priority: {  // Prioridad (mayor número = mayor prioridad)
    type: Number,
    default: 0,
    min: 0
  },
  stackable: {  // Si se puede combinar con otras promociones
    type: Boolean,
    default: false
  },
  createdBy: {  // Usuario que creó la promoción
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {  // Usuario que actualizó la promoción
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para búsquedas rápidas
promotionSchema.index({ name: 1 });
promotionSchema.index({ code: 1 });
promotionSchema.index({ isActive: 1 });
promotionSchema.index({ startDate: 1, endDate: 1 });
promotionSchema.index({ type: 1 });
promotionSchema.index({ priority: -1 });

// Virtual: está activa actualmente
promotionSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
});

// Virtual: días restantes
promotionSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  if (now > this.endDate) return 0;
  const diffTime = Math.abs(this.endDate - now);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual: porcentaje de uso
promotionSchema.virtual('usagePercentage').get(function() {
  if (!this.usageLimit) return 0;
  return (this.usedCount / this.usageLimit) * 100;
});

// Middleware: validar fechas
promotionSchema.pre('save', function(next) {
  if (this.startDate > this.endDate) {
    next(new Error('Start date cannot be after end date'));
  }
  
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  
  next();
});

// Método de instancia: verificar si está vigente
promotionSchema.methods.isValid = function(date = new Date()) {
  return this.isActive && date >= this.startDate && date <= this.endDate;
};

// Método de instancia: verificar límite de uso
promotionSchema.methods.checkUsageLimit = function(clientId = null) {
  if (this.usageLimit && this.usedCount >= this.usageLimit) {
    return { valid: false, reason: 'Promotion usage limit reached' };
  }
  
  if (clientId && this.usageLimitPerCustomer) {
    const customer = this.customerUsage.find(c => c.clientId.toString() === clientId);
    if (customer && customer.count >= this.usageLimitPerCustomer) {
      return { valid: false, reason: 'Customer usage limit reached' };
    }
  }
  
  return { valid: true };
};

// Método de instancia: registrar uso
promotionSchema.methods.registerUsage = async function(clientId = null) {
  this.usedCount += 1;
  
  if (clientId) {
    const customerIndex = this.customerUsage.findIndex(c => c.clientId.toString() === clientId);
    if (customerIndex >= 0) {
      this.customerUsage[customerIndex].count += 1;
      this.customerUsage[customerIndex].lastUsed = new Date();
    } else {
      this.customerUsage.push({
        clientId,
        count: 1,
        lastUsed: new Date()
      });
    }
  }
  
  await this.save();
  return this;
};

// Método de instancia: calcular descuento para un producto
promotionSchema.methods.calculateDiscount = function(product, quantity = 1, unitPrice = null) {
  const price = unitPrice || product.price;
  let discount = 0;
  let discountDescription = '';
  
  for (const benefit of this.benefits) {
    switch (benefit.type) {
      case 'percentage_discount':
        discount = (price * quantity * benefit.value) / 100;
        discountDescription = `${benefit.value}% off`;
        break;
      case 'fixed_discount':
        discount = benefit.value * quantity;
        discountDescription = `$${benefit.value} off`;
        break;
      case 'buy_x_get_y':
        // Implementar lógica de compra X lleva Y
        const x = benefit.value.buy;
        const y = benefit.value.get;
        const freeItems = Math.floor(quantity / (x + y)) * y;
        discount = (price * freeItems);
        discountDescription = `Buy ${x} get ${y} free`;
        break;
    }
  }
  
  // Aplicar límite máximo de descuento si existe
  if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
    discount = this.maxDiscountAmount;
  }
  
  return {
    discount,
    discountDescription,
    finalPrice: (price * quantity) - discount
  };
};

// Método estático: obtener promociones activas
promotionSchema.statics.getActivePromotions = async function(date = new Date()) {
  return this.find({
    isActive: true,
    startDate: { $lte: date },
    endDate: { $gte: date }
  }).sort({ priority: -1 });
};

// Método estático: obtener promoción por código
promotionSchema.statics.getByCode = async function(code, date = new Date()) {
  return this.findOne({
    code: code.toUpperCase(),
    isActive: true,
    startDate: { $lte: date },
    endDate: { $gte: date }
  });
};

// Método estático: validar si un producto aplica a una promoción
promotionSchema.statics.productApplies = function(promotion, product) {
  // Verificar productos aplicables
  if (promotion.applicableProducts) {
    if (promotion.applicableProducts.includeAll) {
      // Verificar si está en productos excluidos
      if (promotion.applicableProducts.excludedProducts.includes(product._id)) {
        return false;
      }
    } else {
      // Verificar si está en productos incluidos
      if (!promotion.applicableProducts.productId || 
          promotion.applicableProducts.productId.toString() !== product._id.toString()) {
        return false;
      }
    }
  }
  
  // Verificar categorías aplicables
  if (promotion.applicableCategories && product.categoryId) {
    if (promotion.applicableCategories.includeAll) {
      if (promotion.applicableCategories.excludedCategories.includes(product.categoryId)) {
        return false;
      }
    } else {
      if (!promotion.applicableCategories.categoryId || 
          promotion.applicableCategories.categoryId.toString() !== product.categoryId.toString()) {
        return false;
      }
    }
  }
  
  // Verificar talles aplicables
  if (promotion.applicableSizes && promotion.applicableSizes.length > 0) {
    // Esta validación se hace a nivel de variante en el servicio
  }
  
  // Verificar colores aplicables
  if (promotion.applicableColors && promotion.applicableColors.length > 0) {
    // Esta validación se hace a nivel de variante en el servicio
  }
  
  return true;
};

module.exports = mongoose.model('Promotion', promotionSchema);