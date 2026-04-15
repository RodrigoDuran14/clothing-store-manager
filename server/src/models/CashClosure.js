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
    default: () => new Date().setHours(0, 0, 0, 0)
  },
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
  salesTotal: {
    type: Number,
    default: 0
  },
  expensesTotal: {
    type: Number,
    default: 0
  },
  withdrawalsTotal: {
    type: Number,
    default: 0
  },
  depositsTotal: {
    type: Number,
    default: 0
  },
  transfersTotal: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'audited'],
    default: 'open'
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closedAt: Date,
  notes: String
}, {
  timestamps: true
});

cashClosureSchema.index({ cashRegisterId: 1, date: 1 }, { unique: true });
cashClosureSchema.index({ partnerId: 1 });
cashClosureSchema.index({ status: 1 });

module.exports = mongoose.model('CashClosure', cashClosureSchema);