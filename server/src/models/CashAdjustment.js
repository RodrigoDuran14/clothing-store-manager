const mongoose = require('mongoose');

const cashAdjustmentSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['surplus', 'shortage', 'correction'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  previousBalance: {
    type: Number,
    required: true
  },
  newBalance: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CashAdjustment', cashAdjustmentSchema);