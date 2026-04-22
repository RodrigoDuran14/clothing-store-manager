const mongoose = require('mongoose');

// Esquema para movimientos de caja por socio
const cashMovementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['sale', 'expense', 'withdrawal', 'deposit', 'transfer_in', 'transfer_out', 'adjustment'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: String,
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    enum: ['Sale', 'Expense', 'Transfer']
  },
  date: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const partnerCashRegisterSchema = new mongoose.Schema({
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  initialBalance: {
    type: Number,
    default: 0
  },
  movements: [cashMovementSchema],
  isOpen: {
    type: Boolean,
    default: true
  },
  openedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: Date,
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastMovementAt: Date,
  
  // NUEVOS CAMPOS PARA CONTROL DIARIO (sin conteo de billetes)
  expectedCash: {
    type: Number,
    default: 0
  },
  lastClosureDate: {
    type: Date
  },
  lastClosureBalance: {
    type: Number,
    default: 0
  },
  discrepancies: [{
    date: Date,
    expected: Number,
    actual: Number,
    difference: Number,
    resolved: Boolean,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String
  }],
  cashierName: {
    type: String,
    trim: true
  },
  openingCashierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closingCashierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices
partnerCashRegisterSchema.index({ partnerId: 1 });
partnerCashRegisterSchema.index({ isOpen: 1 });

// Virtual: nombre del socio
partnerCashRegisterSchema.virtual('partnerName', {
  ref: 'Partner',
  localField: 'partnerId',
  foreignField: '_id',
  justOne: true,
  options: { select: 'name' }
});

// Método: agregar movimiento
partnerCashRegisterSchema.methods.addMovement = async function(
  type,
  amount,
  description,
  referenceId = null,
  referenceModel = null,
  userId = null
) {
  let newBalance = this.balance;
  
  switch (type) {
    case 'sale':
    case 'deposit':
    case 'transfer_in':
      newBalance = this.balance + amount;
      break;
    case 'expense':
    case 'withdrawal':
    case 'transfer_out':
      newBalance = this.balance - amount;
      break;
    case 'adjustment':
      newBalance = amount;
      break;
  }
  
  if (newBalance < 0) {
    throw new Error(`Insufficient funds in cash register. Balance: ${this.balance}`);
  }
  
  const movement = {
    type,
    amount,
    balanceAfter: newBalance,
    description,
    referenceId,
    referenceModel,
    date: new Date(),
    createdBy: userId
  };
  
  this.movements.push(movement);
  this.balance = newBalance;
  this.lastMovementAt = new Date();
  
  await this.save();
  return movement;
};

// Método: cerrar caja
partnerCashRegisterSchema.methods.close = async function(userId) {
  if (!this.isOpen) {
    throw new Error('Cash register is already closed');
  }
  
  this.isOpen = false;
  this.closedAt = new Date();
  this.closedBy = userId;
  this.closingCashierId = userId;
  
  await this.save();
  return this;
};

// Método: abrir caja
partnerCashRegisterSchema.methods.open = async function(userId, initialBalance = 0) {
  if (this.isOpen) {
    throw new Error('Cash register is already open');
  }
  
  this.isOpen = true;
  this.openedAt = new Date();
  this.closedAt = null;
  this.closedBy = null;
  this.openingCashierId = userId;
  
  if (initialBalance > 0) {
    await this.addMovement('deposit', initialBalance, 'Opening balance', null, null, userId);
  }
  
  await this.save();
  return this;
};

// Método: calcular efectivo esperado del día
partnerCashRegisterSchema.methods.calculateExpectedCash = async function(date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Ventas en efectivo del día
  const Sale = mongoose.model('Sale');
  const sales = await Sale.find({
    date: { $gte: startOfDay, $lte: endOfDay },
    status: 'completed',
    'payments.method': 'cash'
  });
  
  const cashSales = sales.reduce((sum, sale) => {
    const cashPayments = sale.payments.filter(p => p.method === 'cash');
    return sum + cashPayments.reduce((s, p) => s + p.amount, 0);
  }, 0);
  
  // Gastos en efectivo del día
  const Expense = mongoose.model('Expense');
  const expenses = await Expense.find({
    partnerId: this.partnerId,
    date: { $gte: startOfDay, $lte: endOfDay },
    paymentMethod: 'cash'
  });
  
  const cashExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Retiros y depósitos
  const withdrawals = this.movements
    .filter(m => m.type === 'withdrawal' && m.date >= startOfDay && m.date <= endOfDay)
    .reduce((sum, m) => sum + m.amount, 0);
  
  const deposits = this.movements
    .filter(m => m.type === 'deposit' && m.date >= startOfDay && m.date <= endOfDay)
    .reduce((sum, m) => sum + m.amount, 0);
  
  const expected = this.initialBalance + cashSales + deposits - cashExpenses - withdrawals;
  
  return {
    expected,
    cashSales,
    cashExpenses,
    withdrawals,
    deposits,
    openingBalance: this.initialBalance
  };
};

module.exports = mongoose.model('PartnerCashRegister', partnerCashRegisterSchema);