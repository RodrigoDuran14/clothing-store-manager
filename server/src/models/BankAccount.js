const mongoose = require('mongoose');

// Esquema para movimientos bancarios
const bankMovementSchema = new mongoose.Schema({
  type: {  // Tipo de movimiento
    type: String,
    enum: ['sale', 'payment', 'refund', 'transfer_in', 'transfer_out', 'fee', 'adjustment'],
    required: true
  },
  amount: {  // Monto del movimiento
    type: Number,
    required: true,
    min: 0
  },
  balanceAfter: {  // Saldo después del movimiento
    type: Number,
    required: true
  },
  description: {  // Descripción del movimiento
    type: String,
    trim: true,
    required: true
  },
  referenceId: {  // Referencia a la entidad origen (sale, payment, return)
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel'
  },
  referenceModel: {  // Modelo de referencia
    type: String,
    enum: ['Sale', 'Payment', 'Return', 'Transfer']
  },
  referenceNumber: {  // Número de referencia (ej: número de venta)
    type: String,
    trim: true
  },
  date: {  // Fecha del movimiento
    type: Date,
    default: Date.now,
    index: true
  },
  reconciled: {  // Si fue conciliado con extracto bancario
    type: Boolean,
    default: false
  },
  reconciledAt: {  // Fecha de conciliación
    type: Date
  },
  reconciledBy: {  // Usuario que realizó la conciliación
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {  // Notas adicionales
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  createdBy: {  // Usuario que creó el movimiento
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Esquema para cuenta bancaria
const bankAccountSchema = new mongoose.Schema({
  bankName: {  // Nombre del banco
    type: String,
    required: [true, 'Bank name is required'],
    trim: true,
    maxlength: [100, 'Bank name cannot exceed 100 characters']
  },
  accountType: {  // Tipo de cuenta
    type: String,
    enum: ['checking', 'savings', 'credit_card', 'mercadopago', 'other'],
    required: true,
    default: 'checking'
  },
  accountNumber: {  // Número de cuenta
    type: String,
    required: [true, 'Account number is required'],
    unique: true,
    trim: true
  },
  cbu: {  // CBU (Clave Bancaria Uniforme)
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: [/^\d{22}$/, 'CBU must be 22 digits']
  },
  alias: {  // Alias de la cuenta
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  currency: {  // Moneda
    type: String,
    enum: ['ARS', 'USD', 'EUR', 'BRL'],
    default: 'ARS'
  },
  balance: {  // Saldo actual
    type: Number,
    default: 0,
    min: 0
  },
  initialBalance: {  // Saldo inicial al crear la cuenta
    type: Number,
    default: 0,
    min: 0
  },
  movements: [bankMovementSchema],  // Historial de movimientos
  isActive: {  // Si la cuenta está activa
    type: Boolean,
    default: true
  },
  isDefault: {  // Si es la cuenta por defecto para ventas
    type: Boolean,
    default: false
  },
  businessName: {  // Razón social del titular
    type: String,
    trim: true
  },
  taxId: {  // CUIT/CUIL del titular
    type: String,
    trim: true,
    match: [/^\d{2}-\d{8}-\d{1}$/, 'Invalid Tax ID format']
  },
  notes: {  // Notas adicionales
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  lastReconciliation: {  // Última fecha de conciliación
    type: Date
  },
  createdBy: {  // Usuario que creó la cuenta
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {  // Usuario que actualizó la cuenta
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para búsquedas rápidas
bankAccountSchema.index({ bankName: 1 });
bankAccountSchema.index({ accountNumber: 1 });
bankAccountSchema.index({ cbu: 1 });
bankAccountSchema.index({ alias: 1 });
bankAccountSchema.index({ isActive: 1 });
bankAccountSchema.index({ isDefault: 1 });
bankAccountSchema.index({ currency: 1 });
bankAccountSchema.index({ 'movements.date': -1 });

// Virtual: nombre completo de la cuenta
bankAccountSchema.virtual('fullName').get(function() {
  return `${this.bankName} - ${this.accountType} - ${this.accountNumber}`;
});

// Virtual: saldo disponible (considerando solo movimientos conciliados)
bankAccountSchema.virtual('reconciledBalance').get(function() {
  const reconciledMovements = this.movements.filter(m => m.reconciled);
  if (reconciledMovements.length === 0) return this.initialBalance;
  
  const lastReconciled = reconciledMovements[reconciledMovements.length - 1];
  return lastReconciled.balanceAfter;
});

// Middleware: asegurar que solo una cuenta sea por defecto
bankAccountSchema.pre('save', async function(next) {
  if (this.isDefault && this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  next();
});

// Middleware: actualizar updatedBy
bankAccountSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedBy: this.getUpdate().$set?.updatedBy || this.getUpdate().updatedBy });
  next();
});

// Método de instancia: agregar movimiento
bankAccountSchema.methods.addMovement = async function(
  type,
  amount,
  description,
  referenceId = null,
  referenceModel = null,
  referenceNumber = null,
  userId = null,
  session = null
) {
  let newBalance = this.balance;
  
  // Calcular nuevo saldo según tipo de movimiento
  switch (type) {
    case 'sale':
    case 'payment':
    case 'transfer_in':
      newBalance = this.balance + amount;
      break;
    case 'refund':
    case 'transfer_out':
    case 'fee':
      newBalance = this.balance - amount;
      break;
    case 'adjustment':
      newBalance = amount;
      break;
  }
  
  // Validar que no quede negativo
  if (newBalance < 0) {
    throw new Error(`Insufficient funds. Current balance: ${this.balance}, Operation: ${amount}`);
  }
  
  const movement = {
    type,
    amount,
    balanceAfter: newBalance,
    description,
    referenceId,
    referenceModel,
    referenceNumber,
    date: new Date(),
    createdBy: userId || this.createdBy
  };
  
  this.movements.push(movement);
  this.balance = newBalance;
  
  const saveOptions = session ? { session } : {};
  await this.save(saveOptions);
  
  return movement;
};

// Método de instancia: conciliar movimiento
bankAccountSchema.methods.reconcileMovement = async function(movementId, userId) {
  const movement = this.movements.id(movementId);
  if (!movement) {
    throw new Error('Movement not found');
  }
  
  if (movement.reconciled) {
    throw new Error('Movement already reconciled');
  }
  
  movement.reconciled = true;
  movement.reconciledAt = new Date();
  movement.reconciledBy = userId;
  
  this.lastReconciliation = new Date();
  await this.save();
  
  return movement;
};

// Método de instancia: obtener resumen de movimientos por período
bankAccountSchema.methods.getMovementSummary = async function(startDate, endDate) {
  const movements = this.movements.filter(m => 
    m.date >= startDate && m.date <= endDate
  );
  
  const income = movements
    .filter(m => ['sale', 'payment', 'transfer_in'].includes(m.type))
    .reduce((sum, m) => sum + m.amount, 0);
  
  const expenses = movements
    .filter(m => ['refund', 'transfer_out', 'fee'].includes(m.type))
    .reduce((sum, m) => sum + m.amount, 0);
  
  return {
    startBalance: this.initialBalance,
    income,
    expenses,
    endBalance: this.balance,
    movementCount: movements.length,
    movements
  };
};

// Método estático: obtener cuenta por defecto
bankAccountSchema.statics.getDefaultAccount = async function() {
  let defaultAccount = await this.findOne({ isDefault: true, isActive: true });
  
  if (!defaultAccount) {
    defaultAccount = await this.findOne({ isActive: true }).sort({ createdAt: 1 });
  }
  
  return defaultAccount;
};

// Método estático: obtener balance total de todas las cuentas
bankAccountSchema.statics.getTotalBalance = async function() {
  const result = await this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$currency', total: { $sum: '$balance' } } }
  ]);
  
  return result;
};

// Método estático: transferir entre cuentas
bankAccountSchema.statics.transfer = async function(
  fromAccountId,
  toAccountId,
  amount,
  description,
  userId,
  session = null
) {
  const fromAccount = await this.findById(fromAccountId);
  const toAccount = await this.findById(toAccountId);
  
  if (!fromAccount || !toAccount) {
    throw new Error('Account not found');
  }
  
  if (fromAccount.balance < amount) {
    throw new Error(`Insufficient funds in ${fromAccount.fullName}`);
  }
  
  // Registrar salida
  await fromAccount.addMovement(
    'transfer_out',
    amount,
    `Transfer to ${toAccount.fullName}: ${description}`,
    toAccountId,
    'BankAccount',
    null,
    userId,
    session
  );
  
  // Registrar entrada
  await toAccount.addMovement(
    'transfer_in',
    amount,
    `Transfer from ${fromAccount.fullName}: ${description}`,
    fromAccountId,
    'BankAccount',
    null,
    userId,
    session
  );
  
  return {
    fromAccount: fromAccount.fullName,
    toAccount: toAccount.fullName,
    amount,
    newBalanceFrom: fromAccount.balance,
    newBalanceTo: toAccount.balance
  };
};

module.exports = mongoose.model('BankAccount', bankAccountSchema);