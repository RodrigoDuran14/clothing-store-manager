const mongoose = require('mongoose');

// Esquema para items de productos en la venta
const saleItemSchema = new mongoose.Schema({
  productId: {  // ID del producto
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  size: {  // Talle
    type: String,
    required: true
  },
  color: {  // Color
    type: String,
    required: true
  },
  quantity: {  // Cantidad
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {  // Precio unitario al momento de la venta
    type: Number,
    required: true,
    min: 0
  },
  discount: {  // Descuento aplicado a este item
    type: Number,
    default: 0,
    min: 0
  },
  subtotal: {  // Subtotal del item (quantity * unitPrice - discount)
    type: Number,
    required: true,
    min: 0
  },
  productName: {  // Nombre del producto (snapshot)
    type: String,
    required: true
  },
  productSku: {  // SKU del producto (snapshot)
    type: String
  }
});

// Esquema para pagos
const paymentSchema = new mongoose.Schema({
  method: {  // Método de pago
    type: String,
    enum: ['cash', 'credit_card', 'debit_card', 'transfer', 'credit_account', 'mixed'],
    required: true
  },
  amount: {  // Monto pagado
    type: Number,
    required: true,
    min: 0
  },
  date: {  // Fecha del pago
    type: Date,
    default: Date.now
  },
  bankAccountId: {  // Cuenta bancaria donde se acredita
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  },
  reference: {  // Referencia (ej: último 4 dígitos de tarjeta, comprobante)
    type: String,
    trim: true
  },
  installments: {  // Número de cuotas (si aplica)
    type: Number,
    min: 1,
    default: 1
  }
});

// Esquema para historial de estados
const statusHistorySchema = new mongoose.Schema({
  status: {  // Estado
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'refunded', 'partially_refunded'],
    required: true
  },
  date: {  // Fecha del cambio
    type: Date,
    default: Date.now
  },
  note: {  // Nota o motivo del cambio
    type: String,
    trim: true
  },
  userId: {  // Usuario que realizó el cambio
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const saleSchema = new mongoose.Schema({
  saleNumber: {  // Número de venta (correlativo)
    type: String,
    unique: true,
    required: true
  },
  clientId: {  // ID del cliente
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client is required']
  },
  sellerId: {  // ID del vendedor
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: [true, 'Seller is required']
  },
  items: [saleItemSchema],  // Productos vendidos
  subtotal: {  // Subtotal sin descuentos
    type: Number,
    required: true,
    min: 0
  },
  discount: {  // Descuento total aplicado
    type: Number,
    default: 0,
    min: 0
  },
  tax: {  // Impuestos (IVA, etc.)
    type: Number,
    default: 0,
    min: 0
  },
  total: {  // Total final (subtotal - discount + tax)
    type: Number,
    required: true,
    min: 0
  },
  payments: [paymentSchema],  // Pagos realizados
  paymentStatus: {  // Estado del pago
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  status: {  // Estado general de la venta
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  statusHistory: [statusHistorySchema],  // Historial de cambios de estado
  promotionId: {  // Promoción aplicada (si aplica)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Promotion'
  },
  promotionDescription: {  // Descripción de la promoción aplicada (snapshot)
    type: String
  },
  notes: {  // Notas adicionales
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  origin: {  // Origen de la venta
    type: String,
    enum: ['physical_store', 'ecommerce', 'phone', 'whatsapp'],
    default: 'physical_store'
  },
  ecommerceOrderId: {  // ID del pedido en ecommerce (si aplica)
    type: String
  },
  shippingCost: {  // Costo de envío (si aplica)
    type: Number,
    default: 0,
    min: 0
  },
  shippingAddress: {  // Dirección de envío (snapshot)
    street: String,
    number: String,
    locality: String,
    city: String,
    province: String,
    zipCode: String
  },
  date: {  // Fecha de la venta
    type: Date,
    default: Date.now,
    index: true
  },
  createdBy: {  // Usuario que registró la venta
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {  // Usuario que actualizó la venta
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para búsquedas rápidas
saleSchema.index({ saleNumber: 1 });
saleSchema.index({ clientId: 1 });
saleSchema.index({ sellerId: 1 });
saleSchema.index({ date: -1 });
saleSchema.index({ status: 1 });
saleSchema.index({ paymentStatus: 1 });
saleSchema.index({ 'items.productId': 1 });
saleSchema.index({ origin: 1 });
saleSchema.index({ total: 1 });

// Virtual: monto pagado total
saleSchema.virtual('paidAmount').get(function() {
  return this.payments.reduce((total, payment) => total + payment.amount, 0);
});

// Virtual: saldo pendiente
saleSchema.virtual('pendingBalance').get(function() {
  return this.total - this.paidAmount;
});

// Virtual: porcentaje pagado
saleSchema.virtual('paymentPercentage').get(function() {
  if (this.total === 0) return 100;
  return (this.paidAmount / this.total) * 100;
});

// Virtual: nombre del cliente (populate)
saleSchema.virtual('clientName', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true,
  options: { select: 'name' }
});

// Virtual: nombre del vendedor (populate)
saleSchema.virtual('sellerName', {
  ref: 'Seller',
  localField: 'sellerId',
  foreignField: '_id',
  justOne: true,
  options: { select: 'firstName lastName' }
});

// Middleware: generar número de venta antes de guardar
saleSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Contar ventas del mes actual
    const startOfMonth = new Date(year, date.getMonth(), 1);
    const endOfMonth = new Date(year, date.getMonth() + 1, 0);
    
    const count = await mongoose.model('Sale').countDocuments({
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });
    
    const sequential = String(count + 1).padStart(6, '0');
    this.saleNumber = `SALE-${year}${month}-${sequential}`;
  }
  next();
});

// Middleware: actualizar paymentStatus automáticamente
saleSchema.pre('save', function(next) {
  const paidAmount = this.paidAmount;
  
  if (paidAmount >= this.total) {
    this.paymentStatus = 'paid';
  } else if (paidAmount > 0) {
    this.paymentStatus = 'partial';
  } else {
    this.paymentStatus = 'pending';
  }
  
  next();
});

// Método de instancia: agregar pago
saleSchema.methods.addPayment = async function(paymentData, userId) {
  this.payments.push(paymentData);
  this.updatedBy = userId;
  await this.save();
  
  return {
    paymentId: this.payments[this.payments.length - 1]._id,
    paidAmount: this.paidAmount,
    pendingBalance: this.pendingBalance,
    paymentStatus: this.paymentStatus
  };
};

// Método de instancia: cambiar estado
saleSchema.methods.changeStatus = async function(newStatus, note, userId) {
  const oldStatus = this.status;
  this.status = newStatus;
  this.updatedBy = userId;
  
  this.statusHistory.push({
    status: newStatus,
    note,
    userId
  });
  
  await this.save();
  
  return {
    oldStatus,
    newStatus,
    changedAt: new Date()
  };
};

// Método de instancia: verificar si se puede cancelar
saleSchema.methods.canCancel = function() {
  return ['pending', 'completed'].includes(this.status) && this.pendingBalance === 0;
};

// Método de instancia: verificar si se puede devolver
saleSchema.methods.canReturn = function() {
  return this.status === 'completed';
};

// Método estático: obtener ventas por período
saleSchema.statics.getSalesByPeriod = async function(startDate, endDate) {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    status: 'completed'
  });
};

// Método estático: obtener total vendido por período
saleSchema.statics.getTotalByPeriod = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$total' },
        count: { $sum: 1 },
        average: { $avg: '$total' }
      }
    }
  ]);
  
  return result[0] || { total: 0, count: 0, average: 0 };
};

// Método estático: obtener productos más vendidos
saleSchema.statics.getTopProducts = async function(startDate, endDate, limit = 10) {
  return this.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.productName' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.subtotal' }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    }
  ]);
};

module.exports = mongoose.model('Sale', saleSchema);