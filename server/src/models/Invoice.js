const mongoose = require('mongoose');

// Esquema para datos del emisor (empresa)
const emitterSchema = new mongoose.Schema({
  businessName: {  // Razón social
    type: String,
    required: true,
    trim: true
  },
  taxId: {  // CUIT
    type: String,
    required: true,
    trim: true,
    match: [/^\d{2}-\d{8}-\d{1}$/, 'Invalid Tax ID format']
  },
  address: {  // Dirección
    street: String,
    number: String,
    city: String,
    province: String,
    zipCode: String
  },
  taxCondition: {  // Condición frente al IVA
    type: String,
    enum: ['responsible', 'monotributist', 'exempt', 'final_consumer'],
    required: true
  },
  vatRate: {  // Tasa de IVA
    type: Number,
    default: 21
  },
  pointOfSale: {  // Punto de venta
    type: String,
    required: true,
    default: '0001'
  },
  logo: {  // Logo de la empresa (base64 o URL)
    type: String
  }
});

// Esquema para datos del receptor (cliente)
const receiverSchema = new mongoose.Schema({
  businessName: {  // Razón social o nombre
    type: String,
    required: true,
    trim: true
  },
  taxId: {  // CUIT/CUIL/DNI
    type: String,
    required: true,
    trim: true
  },
  taxIdType: {  // Tipo de documento
    type: String,
    enum: ['CUIT', 'CUIL', 'DNI', 'PASSPORT'],
    default: 'DNI'
  },
  address: {
    street: String,
    number: String,
    city: String,
    province: String,
    zipCode: String
  },
  taxCondition: {  // Condición frente al IVA
    type: String,
    enum: ['responsible', 'monotributist', 'exempt', 'final_consumer'],
    default: 'final_consumer'
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: String
});

// Esquema para detalles de la factura
const invoiceDetailSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  description: {  // Descripción del producto/servicio
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01
  },
  unitPrice: {  // Precio unitario sin impuestos
    type: Number,
    required: true,
    min: 0
  },
  discount: {  // Descuento aplicado
    type: Number,
    default: 0,
    min: 0
  },
  subtotal: {  // Subtotal antes de impuestos
    type: Number,
    required: true,
    min: 0
  },
  vatRate: {  // Tasa de IVA aplicada
    type: Number,
    default: 21
  },
  vatAmount: {  // Monto de IVA
    type: Number,
    default: 0
  },
  total: {  // Total del item (subtotal + IVA - descuento)
    type: Number,
    required: true,
    min: 0
  }
});

// Esquema para impuestos de la factura
const taxSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['IVA_21', 'IVA_10_5', 'IVA_27', 'PERCEPTION_IIBB', 'PERCEPTION_IVA'],
    required: true
  },
  rate: {  // Tasa aplicada
    type: Number,
    required: true
  },
  amount: {  // Monto del impuesto
    type: Number,
    required: true,
    min: 0
  },
  taxableAmount: {  // Base imponible
    type: Number,
    required: true
  }
});

const invoiceSchema = new mongoose.Schema({
  // Información básica
  invoiceNumber: {  // Número de factura completo (ej: 0001-00000001)
    type: String,
    unique: true,
    required: true
  },
  invoiceType: {  // Tipo de factura
    type: String,
    enum: ['A', 'B', 'C', 'TICKET', 'CREDIT_NOTE', 'DEBIT_NOTE'],
    required: true,
    default: 'B'
  },
  pointOfSale: {  // Punto de venta (4 dígitos)
    type: String,
    required: true,
    match: [/^\d{4}$/, 'Point of sale must be 4 digits']
  },
  sequentialNumber: {  // Número secuencial (8 dígitos)
    type: String,
    required: true,
    match: [/^\d{8}$/, 'Sequential number must be 8 digits']
  },
  
  // Referencias
  saleId: {  // Venta asociada
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true,
    unique: true
  },
  saleNumber: {  // Número de venta (para referencia rápida)
    type: String
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  
  // Datos fiscales
  emitter: emitterSchema,  // Datos del emisor
  receiver: receiverSchema,  // Datos del receptor
  
  // Detalles de la factura
  details: [invoiceDetailSchema],
  
  // Totales
  subtotal: {  // Subtotal sin impuestos
    type: Number,
    required: true,
    min: 0
  },
  totalDiscount: {  // Descuento total
    type: Number,
    default: 0,
    min: 0
  },
  taxes: [taxSchema],  // Lista de impuestos
  totalTaxes: {  // Total de impuestos
    type: Number,
    default: 0,
    min: 0
  },
  total: {  // Total final
    type: Number,
    required: true,
    min: 0
  },
  
  // Método de pago
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'debit_card', 'transfer', 'credit_account', 'mixed'],
    required: true
  },
  bankAccountId: {  // Cuenta bancaria donde se acredita
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  },
  
  // AFIP (integración fiscal)
  afipAuthCode: {  // CAE (Código de Autorización Electrónico)
    type: String
  },
  afipAuthCodeExpiration: {  // Fecha de vencimiento del CAE
    type: Date
  },
  afipQrCode: {  // URL del QR de AFIP
    type: String
  },
  afipResponse: {  // Respuesta completa de AFIP
    type: mongoose.Schema.Types.Mixed
  },
  
  // Estado
  status: {
    type: String,
    enum: ['draft', 'issued', 'cancelled', 'rejected'],
    default: 'draft'
  },
  
  // Fechas
  issueDate: {  // Fecha de emisión
    type: Date,
    default: Date.now
  },
  cancellationDate: {  // Fecha de cancelación
    type: Date
  },
  
  // PDF
  pdfUrl: {  // URL del PDF generado
    type: String
  },
  
  // Metadatos
  notes: {  // Notas adicionales
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para búsquedas rápidas
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ saleId: 1 });
invoiceSchema.index({ clientId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ issueDate: -1 });
invoiceSchema.index({ invoiceType: 1 });
invoiceSchema.index({ 'emitter.taxId': 1 });
invoiceSchema.index({ 'receiver.taxId': 1 });
invoiceSchema.index({ afipAuthCode: 1 });

// Virtual: nombre completo del cliente
invoiceSchema.virtual('clientName', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true,
  options: { select: 'name' }
});

// Virtual: si tiene CAE válido
invoiceSchema.virtual('hasValidCae').get(function() {
  if (!this.afipAuthCode || !this.afipAuthCodeExpiration) return false;
  return new Date() <= this.afipAuthCodeExpiration;
});

// Virtual: formato de factura para mostrar
invoiceSchema.virtual('formattedInvoiceNumber').get(function() {
  return `${this.pointOfSale}-${this.sequentialNumber}`;
});

// Middleware: generar número de factura antes de guardar
invoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    // Buscar el último número secuencial para este punto de venta
    const lastInvoice = await mongoose.model('Invoice').findOne({
      pointOfSale: this.pointOfSale,
      invoiceType: this.invoiceType
    }).sort({ sequentialNumber: -1 });
    
    let nextSequential = 1;
    if (lastInvoice && lastInvoice.sequentialNumber) {
      nextSequential = parseInt(lastInvoice.sequentialNumber) + 1;
    }
    
    this.sequentialNumber = nextSequential.toString().padStart(8, '0');
    this.invoiceNumber = `${this.pointOfSale}-${this.sequentialNumber}`;
  }
  next();
});

// Método de instancia: cancelar factura
invoiceSchema.methods.cancel = async function(userId, reason) {
  if (this.status === 'cancelled') {
    throw new Error('Invoice already cancelled');
  }
  
  if (this.status === 'issued' && this.hasValidCae) {
    // Nota: Para facturas con CAE, se necesita una nota de crédito
    throw new Error('Issued invoices with CAE must be cancelled with a credit note');
  }
  
  this.status = 'cancelled';
  this.cancellationDate = new Date();
  this.cancelledBy = userId;
  this.notes = this.notes ? `${this.notes}\nCancelled: ${reason}` : `Cancelled: ${reason}`;
  
  await this.save();
  return this;
};

// Método de instancia: marcar como emitida
invoiceSchema.methods.markAsIssued = async function(afipData) {
  this.status = 'issued';
  this.issueDate = new Date();
  
  if (afipData) {
    this.afipAuthCode = afipData.cae;
    this.afipAuthCodeExpiration = afipData.expirationDate;
    this.afipQrCode = afipData.qrCode;
    this.afipResponse = afipData.rawResponse;
  }
  
  await this.save();
  return this;
};

// Método estático: obtener facturas por período
invoiceSchema.statics.getByPeriod = async function(startDate, endDate, status = 'issued') {
  return this.find({
    issueDate: { $gte: startDate, $lte: endDate },
    status
  }).sort({ issueDate: -1 });
};

// Método estático: obtener resumen por tipo de factura
invoiceSchema.statics.getSummaryByType = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        issueDate: { $gte: startDate, $lte: endDate },
        status: 'issued'
      }
    },
    {
      $group: {
        _id: '$invoiceType',
        count: { $sum: 1 },
        totalAmount: { $sum: '$total' },
        totalTaxes: { $sum: '$totalTaxes' }
      }
    }
  ]);
};

// Método estático: obtener datos del emisor por defecto (desde configuración)
invoiceSchema.statics.getDefaultEmitter = async function() {
  // Esto debería venir de una tabla de configuración
  // Por ahora, retornamos valores por defecto o los buscamos de la primera factura
  const lastInvoice = await this.findOne().sort({ createdAt: -1 });
  if (lastInvoice && lastInvoice.emitter) {
    return lastInvoice.emitter;
  }
  
  return {
    businessName: 'Mi Tienda SRL',
    taxId: '30-12345678-9',
    taxCondition: 'responsible',
    vatRate: 21,
    pointOfSale: '0001'
  };
};

module.exports = mongoose.model('Invoice', invoiceSchema);