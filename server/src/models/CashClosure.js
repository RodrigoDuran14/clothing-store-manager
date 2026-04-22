const mongoose = require('mongoose');

const cashClosureSchema = new mongoose.Schema({
  cashRegisterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PartnerCashRegister',
    required: true
  },
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: () => new Date().setHours(0, 0, 0, 0),
    index: true
  },
  
  // Saldos
  openingBalance: {
    type: Number,
    required: true
  },
  closingBalance: {
    type: Number,
    required: true
  },
  expectedBalance: {
    type: Number,
    required: true
  },
  difference: {
    type: Number,
    required: true
  },
  
  // Totales del día
  totals: {
    cashSales: { type: Number, default: 0 },
    cardSales: { type: Number, default: 0 },
    transferSales: { type: Number, default: 0 },
    creditSales: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    withdrawals: { type: Number, default: 0 },
    deposits: { type: Number, default: 0 }
  },
  
  // Resumen de movimientos
  movementSummary: {
    totalMovements: { type: Number, default: 0 },
    byType: {
      sale: { count: 0, amount: 0 },
      expense: { count: 0, amount: 0 },
      withdrawal: { count: 0, amount: 0 },
      deposit: { count: 0, amount: 0 },
      transfer: { count: 0, amount: 0 },
      adjustment: { count: 0, amount: 0 }
    }
  },
  
  // Estado
  status: {
    type: String,
    enum: ['open', 'closed', 'audited', 'discrepancy'],
    default: 'open'
  },
  
  // Diferencias
  discrepancy: {
    hasDiscrepancy: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },
    reason: { type: String },
    resolved: { type: Boolean, default: false },
    resolutionNotes: { type: String },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date
  },
  
  // Auditoría
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closedAt: Date,
  auditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  auditedAt: Date,
  notes: String
}, {
  timestamps: true
});

// Índices
cashClosureSchema.index({ cashRegisterId: 1, date: 1 }, { unique: true });
cashClosureSchema.index({ partnerId: 1, date: 1 });
cashClosureSchema.index({ status: 1 });

// Virtual: diferencia porcentual
cashClosureSchema.virtual('differencePercentage').get(function() {
  if (this.expectedBalance === 0) return 0;
  return (Math.abs(this.difference) / this.expectedBalance) * 100;
});

// Virtual: estado de la diferencia
cashClosureSchema.virtual('discrepancyStatus').get(function() {
  if (!this.discrepancy.hasDiscrepancy) return 'Sin diferencia';
  if (this.discrepancy.resolved) return 'Resuelta';
  return 'Pendiente';
});

// Método: registrar discrepancia
cashClosureSchema.methods.registerDiscrepancy = async function(reason, userId) {
  this.status = 'discrepancy';
  this.discrepancy.hasDiscrepancy = true;
  this.discrepancy.amount = this.difference;
  this.discrepancy.reason = reason;
  this.discrepancy.resolved = false;
  await this.save();
  return this;
};

// Método: resolver discrepancia
cashClosureSchema.methods.resolveDiscrepancy = async function(notes, userId) {
  this.discrepancy.resolved = true;
  this.discrepancy.resolutionNotes = notes;
  this.discrepancy.resolvedBy = userId;
  this.discrepancy.resolvedAt = new Date();
  this.status = 'closed';
  await this.save();
  return this;
};

// Método estático: obtener cierres con diferencias
cashClosureSchema.statics.getDiscrepancies = async function(startDate, endDate) {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    'discrepancy.hasDiscrepancy': true
  }).populate('partnerId', 'name').sort({ date: -1 });
};

module.exports = mongoose.model('CashClosure', cashClosureSchema);