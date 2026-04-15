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
  lastMovementAt: Date
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
  
  if (initialBalance > 0) {
    await this.addMovement('deposit', initialBalance, 'Opening balance', null, null, userId);
  }
  
  await this.save();
  return this;
};

module.exports = mongoose.model('PartnerCashRegister', partnerCashRegisterSchema);