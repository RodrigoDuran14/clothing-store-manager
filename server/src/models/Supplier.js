const mongoose = require('mongoose');

// Esquema para dirección
const addressSchema = new mongoose.Schema({
  street: String,
  number: String,
  floor: String,
  locality: String,
  city: String,
  province: String,
  zipCode: String,
  country: {
    type: String,
    default: 'Argentina'
  }
});

// Esquema para información bancaria
const bankInfoSchema = new mongoose.Schema({
  bankName: String,
  accountNumber: String,
  cbu: String,
  alias: String
});

const supplierSchema = new mongoose.Schema({
  name: {  // Nombre del proveedor
    type: String,
    required: [true, 'Supplier name is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  contactName: {  // Nombre del contacto
    type: String,
    trim: true,
    maxlength: [100, 'Contact name cannot exceed 100 characters']
  },
  phone: {  // Teléfono principal
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9+\-\s()]{8,20}$/, 'Invalid phone number']
  },
  phone2: {  // Teléfono secundario
    type: String,
    trim: true,
    match: [/^[0-9+\-\s()]{8,20}$/, 'Invalid phone number']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },
  address: addressSchema,
  taxId: {  // CUIT / Tax ID
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: [/^\d{2}-\d{8}-\d{1}$/, 'Invalid Tax ID format (ej: 20-12345678-9)']
  },
  taxCondition: {  // Condición frente al IVA
    type: String,
    enum: ['responsible', 'monotributist', 'final_consumer', 'exempt', 'non_responsible'],
    default: 'responsible'
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  suppliedProducts: [{  // Productos que suministra
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {  // Calificación (1-5)
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  deliveryTime: {  // Días promedio de entrega
    type: Number,
    default: 7,
    min: 0
  },
  paymentTerms: {  // Condiciones de pago
    type: String,
    enum: ['cash', '15_days', '30_days', '60_days', '90_days'],
    default: 'cash'
  },
  bankInfo: bankInfoSchema,
  lastPurchase: {  // Fecha de última compra
    type: Date,
    default: null
  },
  totalPurchases: {  // Total de compras acumulado
    type: Number,
    default: 0,
    min: 0
  },
  debt: {  // Deuda actual
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para búsquedas rápidas
supplierSchema.index({ name: 1 });
supplierSchema.index({ email: 1 });
supplierSchema.index({ taxId: 1 });
supplierSchema.index({ phone: 1 });
supplierSchema.index({ isActive: 1 });
supplierSchema.index({ rating: -1 });
supplierSchema.index({ totalPurchases: -1 });

// Virtual: productos suministrados (populate)
supplierSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'supplierId'
});

// Virtual: dirección completa
supplierSchema.virtual('fullAddress').get(function() {
  const parts = [];
  if (this.address.street) parts.push(this.address.street);
  if (this.address.number) parts.push(this.address.number);
  if (this.address.floor) parts.push(this.address.floor);
  if (this.address.locality) parts.push(this.address.locality);
  if (this.address.city) parts.push(this.address.city);
  if (this.address.province) parts.push(this.address.province);
  if (this.address.zipCode) parts.push(this.address.zipCode);
  
  return parts.length > 0 ? parts.join(', ') : 'No address registered';
});

// Método estático: obtener proveedores destacados (mejor calificación)
supplierSchema.statics.getTopSuppliers = async function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ rating: -1, totalPurchases: -1 })
    .limit(limit)
    .select('name rating totalPurchases deliveryTime');
};

// Método estático: buscar proveedores por producto
supplierSchema.statics.findByProduct = async function(productId) {
  return this.find({ 
    suppliedProducts: productId,
    isActive: true 
  }).select('name contactName phone email rating');
};

// Método de instancia: agregar producto suministrado
supplierSchema.methods.addProduct = async function(productId) {
  if (!this.suppliedProducts.includes(productId)) {
    this.suppliedProducts.push(productId);
    await this.save();
  }
  return this;
};

// Método de instancia: registrar compra
supplierSchema.methods.recordPurchase = async function(amount) {
  this.lastPurchase = new Date();
  this.totalPurchases += amount;
  await this.save();
  return this;
};

// Método de instancia: actualizar deuda
supplierSchema.methods.updateDebt = async function(amount, type = 'increase') {
  if (type === 'increase') {
    this.debt += amount;
  } else if (type === 'decrease') {
    this.debt = Math.max(0, this.debt - amount);
  }
  await this.save();
  return this;
};

// Middleware: actualizar nombre a mayúsculas
supplierSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.name = this.name.toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Supplier', supplierSchema);