const mongoose = require('mongoose');

// Esquema para dirección del cliente
const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    required: true,
    trim: true
  },
  number: {
    type: String,
    required: true,
    trim: true
  },
  floor: String,
  apartment: String,
  locality: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  province: {
    type: String,
    required: true,
    trim: true
  },
  zipCode: String,
  isMain: {  // Si es la dirección principal
    type: Boolean,
    default: false
  },
  label: {  // Etiqueta: casa, trabajo, otro
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  }
});

// Esquema para movimiento de cuenta corriente
const creditMovementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['purchase', 'payment', 'return', 'adjustment'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    default: Date.now
  },
  description: String,
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    enum: ['Sale', 'Payment', 'Return']
  },
  balanceAfter: Number,
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Esquema para historial de compras
const purchaseHistorySchema = new mongoose.Schema({
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  total: {
    type: Number,
    required: true
  },
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: String,
    quantity: Number,
    unitPrice: Number,
    subtotal: Number
  }],
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'returned'],
    default: 'completed'
  }
});

// Esquema para preferencias del cliente
const preferencesSchema = new mongoose.Schema({
  sizes: [String],  // Talles preferidos
  favoriteColors: [String],  // Colores favoritos
  preferredCategories: [{  // Categorías preferidas
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  favoriteBrands: [String],  // Marcas preferidas
  shoeSize: String,  // Talle de calzado
  pantsSize: String,  // Talle de pantalón
  observations: String  // Observaciones adicionales
});

const clientSchema = new mongoose.Schema({
  name: {  // Nombre completo
    type: String,
    required: [true, 'Client name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9+\-\s()]{8,20}$/, 'Invalid phone number']
  },
  document: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  documentType: {
    type: String,
    enum: ['DNI', 'CUIL', 'CUIT', 'PASSPORT', 'OTHER'],
    default: 'DNI'
  },
  birthDate: {
    type: Date
  },
  addresses: [addressSchema],
  creditAccount: {  // Cuenta corriente
    isEnabled: {
      type: Boolean,
      default: false
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0
    },
    balance: {
      type: Number,
      default: 0
    },
    movements: [creditMovementSchema],
    activationDate: Date,
    lastMovementDate: Date
  },
  purchaseHistory: [purchaseHistorySchema],
  preferences: preferencesSchema,
  isActive: {
    type: Boolean,
    default: true
  },
  isVip: {
    type: Boolean,
    default: false
  },
  clientCategory: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  lastPurchase: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  subscribesToNewsletter: {
    type: Boolean,
    default: false
  },
  howDidYouFindUs: {
    type: String,
    enum: ['social_media', 'referral', 'search_engine', 'advertisement', 'other'],
    default: 'other'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para búsquedas rápidas
clientSchema.index({ name: 'text', email: 'text', document: 'text' });
clientSchema.index({ email: 1 });
clientSchema.index({ document: 1 });
clientSchema.index({ phone: 1 });
clientSchema.index({ isActive: 1 });
clientSchema.index({ isVip: 1 });
clientSchema.index({ clientCategory: 1 });
clientSchema.index({ totalSpent: -1 });
clientSchema.index({ lastPurchase: -1 });
clientSchema.index({ 'creditAccount.isEnabled': 1 });
clientSchema.index({ 'creditAccount.balance': -1 });

// Virtual: edad
clientSchema.virtual('age').get(function() {
  if (!this.birthDate) return null;
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual: dirección principal
clientSchema.virtual('mainAddress').get(function() {
  return this.addresses.find(addr => addr.isMain) || this.addresses[0];
});

// Virtual: saldo disponible en cuenta corriente
clientSchema.virtual('availableCredit').get(function() {
  if (!this.creditAccount.isEnabled) return 0;
  return this.creditAccount.creditLimit - this.creditAccount.balance;
});

// Virtual: porcentaje de crédito usado
clientSchema.virtual('creditUsagePercentage').get(function() {
  if (!this.creditAccount.isEnabled || this.creditAccount.creditLimit === 0) return 0;
  return (this.creditAccount.balance / this.creditAccount.creditLimit) * 100;
});

// Método estático: actualizar categoría del cliente basado en gastos
clientSchema.statics.updateClientCategory = async function(clientId) {
  const client = await this.findById(clientId);
  if (!client) return null;
  
  let newCategory = 'bronze';
  if (client.totalSpent >= 500000) newCategory = 'platinum';
  else if (client.totalSpent >= 200000) newCategory = 'gold';
  else if (client.totalSpent >= 50000) newCategory = 'silver';
  
  if (client.clientCategory !== newCategory) {
    client.clientCategory = newCategory;
    await client.save();
  }
  
  return client;
};

// Método estático: obtener clientes con cuenta corriente en riesgo
clientSchema.statics.getClientsWithCreditRisk = async function(percentage = 80) {
  return this.find({
    'creditAccount.isEnabled': true,
    'creditAccount.creditLimit': { $gt: 0 }
  }).then(clients => {
    return clients.filter(client => client.creditUsagePercentage >= percentage);
  });
};

// Método de instancia: agregar movimiento a cuenta corriente
clientSchema.methods.addCreditMovement = async function(type, amount, description, referenceId = null, referenceModel = null, userId = null) {
  const movement = {
    type,
    amount,
    date: new Date(),
    description,
    referenceId,
    referenceModel,
    registeredBy: userId
  };
  
  // Actualizar saldo
  if (type === 'purchase') {
    this.creditAccount.balance += amount;
  } else if (type === 'payment' || type === 'return') {
    this.creditAccount.balance = Math.max(0, this.creditAccount.balance - amount);
  }
  
  movement.balanceAfter = this.creditAccount.balance;
  this.creditAccount.movements.push(movement);
  this.creditAccount.lastMovementDate = new Date();
  
  await this.save();
  return movement;
};

// Método de instancia: registrar compra en historial
clientSchema.methods.addPurchaseToHistory = async function(saleId, total, products, status = 'completed') {
  const purchase = {
    saleId,
    date: new Date(),
    total,
    products,
    status
  };
  
  this.purchaseHistory.push(purchase);
  this.totalSpent += total;
  this.lastPurchase = new Date();
  
  // Actualizar VIP basado en total gastado
  if (this.totalSpent >= 100000 && !this.isVip) {
    this.isVip = true;
  }
  
  await this.save();
  await this.constructor.updateClientCategory(this._id);
  
  return purchase;
};

// Método de instancia: verificar límite de crédito
clientSchema.methods.checkCreditLimit = function(purchaseAmount = 0) {
  if (!this.creditAccount.isEnabled) {
    return { allowed: false, message: 'Client does not have credit account enabled' };
  }
  
  const newBalance = this.creditAccount.balance + purchaseAmount;
  const withinLimit = newBalance <= this.creditAccount.creditLimit;
  
  return {
    allowed: withinLimit,
    currentBalance: this.creditAccount.balance,
    creditLimit: this.creditAccount.creditLimit,
    newBalance: newBalance,
    availableCredit: this.availableCredit,
    message: withinLimit ? 'Credit available' : 'Credit limit exceeded'
  };
};

// Middleware: actualizar fechas
clientSchema.pre('save', function(next) {
  if (this.isModified('creditAccount.isEnabled') && this.creditAccount.isEnabled) {
    this.creditAccount.activationDate = new Date();
  }
  next();
});

module.exports = mongoose.model('Client', clientSchema);