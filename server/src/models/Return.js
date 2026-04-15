const mongoose = require('mongoose');

// Esquema para items devueltos
const returnItemSchema = new mongoose.Schema({
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
  quantity: {  // Cantidad devuelta
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {  // Precio unitario al momento de la venta
    type: Number,
    required: true,
    min: 0
  },
  refundAmount: {  // Monto a reembolsar por este item
    type: Number,
    required: true,
    min: 0
  },
  productName: {  // Nombre del producto (snapshot)
    type: String,
    required: true
  },
  condition: {  // Condición del producto devuelto
    type: String,
    enum: ['new', 'used_good', 'used_fair', 'damaged'],
    default: 'new'
  }
});

// Esquema para imágenes de la devolución
const returnImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String },
  description: { type: String }
});

// Esquema para seguimiento de la devolución
const returnTrackingSchema = new mongoose.Schema({
  status: {  // Estado del seguimiento
    type: String,
    enum: ['pending_review', 'approved', 'rejected', 'processing', 'completed'],
    default: 'pending_review'
  },
  date: {  // Fecha del cambio
    type: Date,
    default: Date.now
  },
  note: {  // Nota o comentario
    type: String,
    trim: true
  },
  userId: {  // Usuario que realizó el cambio
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const returnSchema = new mongoose.Schema({
  returnNumber: {  // Número de devolución (correlativo)
    type: String,
    unique: true,
    required: true
  },
  saleId: {  // Venta original
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: [true, 'Original sale is required']
  },
  clientId: {  // Cliente que devuelve
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client is required']
  },
  sellerId: {  // Vendedor que procesa la devolución
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: [true, 'Seller is required']
  },
  items: [returnItemSchema],  // Productos devueltos
  subtotal: {  // Subtotal de la devolución
    type: Number,
    required: true,
    min: 0
  },
  totalRefund: {  // Total a reembolsar
    type: Number,
    required: true,
    min: 0
  },
  refundMethod: {  // Método de reembolso
    type: String,
    enum: ['cash', 'credit_card', 'transfer', 'credit_account', 'voucher', 'mixed'],
    required: true
  },
  refundDetails: {  // Detalles del reembolso
    cashAmount: { type: Number, default: 0 },
    cardAmount: { type: Number, default: 0 },
    transferAmount: { type: Number, default: 0 },
    creditAccountAmount: { type: Number, default: 0 },
    voucherAmount: { type: Number, default: 0 },
    voucherCode: { type: String },  // Código del vale
    voucherExpiryDate: { type: Date },  // Fecha de expiración del vale
    reference: { type: String }  // Referencia de transacción
  },
  reason: {  // Motivo de la devolución
    type: String,
    required: [true, 'Return reason is required'],
    enum: [
      'wrong_size',
      'wrong_color',
      'defective',
      'damaged',
      'not_as_described',
      'change_of_mind',
      'other'
    ]
  },
  reasonDescription: {  // Descripción detallada del motivo
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  images: [returnImageSchema],  // Imágenes de evidencia
  status: {  // Estado general de la devolución
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  tracking: [returnTrackingSchema],  // Historial de seguimiento
  processedBy: {  // Usuario que procesó la devolución
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {  // Usuario que aprobó (si aplica)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {  // Fecha de aprobación
    type: Date
  },
  completedAt: {  // Fecha de completado
    type: Date
  },
  notes: {  // Notas internas
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  restocked: {  // Si el stock fue restaurado
    type: Boolean,
    default: false
  },
  refundProcessed: {  // Si el reembolso fue procesado
    type: Boolean,
    default: false
  },
  refundProcessedAt: {  // Fecha de procesamiento del reembolso
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para búsquedas rápidas
returnSchema.index({ returnNumber: 1 });
returnSchema.index({ saleId: 1 });
returnSchema.index({ clientId: 1 });
returnSchema.index({ status: 1 });
returnSchema.index({ reason: 1 });
returnSchema.index({ createdAt: -1 });
returnSchema.index({ 'items.productId': 1 });

// Virtual: nombre del cliente (populate)
returnSchema.virtual('clientName', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true,
  options: { select: 'name email' }
});

// Virtual: número de venta original
returnSchema.virtual('originalSaleNumber', {
  ref: 'Sale',
  localField: 'saleId',
  foreignField: '_id',
  justOne: true,
  options: { select: 'saleNumber' }
});

// Middleware: generar número de devolución antes de guardar
returnSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Contar devoluciones del mes actual
    const startOfMonth = new Date(year, date.getMonth(), 1);
    const endOfMonth = new Date(year, date.getMonth() + 1, 0);
    
    const count = await mongoose.model('Return').countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });
    
    const sequential = String(count + 1).padStart(6, '0');
    this.returnNumber = `RET-${year}${month}-${sequential}`;
  }
  next();
});

// Método de instancia: agregar seguimiento
returnSchema.methods.addTracking = async function(status, note, userId) {
  this.tracking.push({
    status,
    note,
    userId
  });
  
  this.status = status === 'completed' ? 'completed' : 
                 status === 'approved' ? 'approved' :
                 status === 'rejected' ? 'rejected' : this.status;
  
  if (status === 'approved') {
    this.approvedBy = userId;
    this.approvedAt = new Date();
  }
  
  if (status === 'completed') {
    this.completedAt = new Date();
  }
  
  await this.save();
  return this.tracking[this.tracking.length - 1];
};

// Método de instancia: aprobar devolución
returnSchema.methods.approve = async function(userId, notes) {
  if (this.status !== 'pending') {
    throw new Error('Only pending returns can be approved');
  }
  
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  
  if (notes) this.notes = notes;
  
  await this.addTracking('approved', `Return approved by ${userId}`, userId);
  return this;
};

// Método de instancia: rechazar devolución
returnSchema.methods.reject = async function(userId, reason) {
  if (this.status !== 'pending') {
    throw new Error('Only pending returns can be rejected');
  }
  
  this.status = 'rejected';
  
  await this.addTracking('rejected', reason || 'Return rejected', userId);
  return this;
};

// Método de instancia: completar devolución
returnSchema.methods.complete = async function(userId, refundDetails) {
  if (this.status !== 'approved') {
    throw new Error('Only approved returns can be completed');
  }
  
  if (refundDetails) {
    this.refundDetails = { ...this.refundDetails, ...refundDetails };
  }
  
  this.status = 'completed';
  this.completedAt = new Date();
  this.refundProcessed = true;
  this.refundProcessedAt = new Date();
  
  await this.addTracking('completed', 'Return completed', userId);
  return this;
};

// Método de instancia: verificar si se puede modificar
returnSchema.methods.canModify = function() {
  return ['pending'].includes(this.status);
};

// Método de instancia: verificar si se puede cancelar
returnSchema.methods.canCancel = function() {
  return ['pending', 'approved'].includes(this.status);
};

// Método estático: obtener devoluciones por período
returnSchema.statics.getReturnsByPeriod = async function(startDate, endDate, status = null) {
  const filter = {
    createdAt: { $gte: startDate, $lte: endDate }
  };
  
  if (status) filter.status = status;
  
  return this.find(filter);
};

// Método estático: obtener estadísticas de devoluciones
returnSchema.statics.getReturnStats = async function(startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalReturns: { $sum: 1 },
        totalRefundAmount: { $sum: '$totalRefund' },
        averageRefund: { $avg: '$totalRefund' }
      }
    }
  ]);
  
  // Devoluciones por motivo
  const returnsByReason = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$reason',
        count: { $sum: 1 },
        totalRefund: { $sum: '$totalRefund' }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  // Productos más devueltos
  const topReturnedProducts = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.productName' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRefund: { $sum: '$items.refundAmount' },
        returnCount: { $sum: 1 }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 10 }
  ]);
  
  return {
    summary: stats[0] || { totalReturns: 0, totalRefundAmount: 0, averageRefund: 0 },
    byReason: returnsByReason,
    topReturnedProducts
  };
};

module.exports = mongoose.model('Return', returnSchema);