// models/Cart.js
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  size: {
    type: String,
    required: true,
    uppercase: true
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  priceAtTime: { // precio vigente al agregar (para evitar cambios de precio mientras está en carrito)
    type: Number,
    required: true,
    min: 0
  },
  discountAtTime: Number, // descuento aplicable en ese momento (si lo hubiera)
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema({
  // Puede pertenecer a un cliente registrado o a una sesión anónima
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    sparse: true,
    index: true
  },
  sessionId: { // identificador único para visitantes no logueados (ej: uuid generado en frontend)
    type: String,
    sparse: true,
    index: true
  },
  items: [cartItemSchema],
  expiresAt: {
    type: Date,
    default: () => Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 días
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  shippingAddress: {
  street: String,
  number: String,
  city: String,
  province: String,
  zipCode: String,
  phone: String
},
paymentPreferenceId: String,
});

// Asegurar que no haya duplicados: un cliente o sesión solo tiene un carrito activo
cartSchema.index({ clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $ne: null } } });
cartSchema.index({ sessionId: 1 }, { unique: true, partialFilterExpression: { sessionId: { $ne: null } } });

// Middleware para actualizar updatedAt
cartSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Método para calcular total del carrito (sin promociones, solo precios base)
cartSchema.methods.calculateSubtotal = function() {
  return this.items.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0);
};

// Método para obtener productos completos (populate)
cartSchema.methods.getPopulatedItems = async function() {
  await this.populate('items.productId', 'name images price variants');
  return this.items;
};

module.exports = mongoose.model('Cart', cartSchema);