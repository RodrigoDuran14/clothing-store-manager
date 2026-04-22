const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  partnerId: {  // Socio que paga el gasto
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true
  },
  category: {  // Categoría del gasto
    type: String,
    enum: ['rent', 'salaries', 'supplies', 'services', 'taxes', 'maintenance', 'marketing', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'credit_card', 'debit_card'],
    default: 'cash'
  },
  bankAccountId: {  // Si se pagó desde cuenta bancaria
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  },
  receiptImage: {  // Imagen del comprobante
    type: String
  },
  receiptNumber: {  // Número de factura/comprobante
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  registeredInCash: {  // Si ya se registró en la caja
    type: Boolean,
    default: false
  },
  registeredAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
}, {
  timestamps: true
});

expenseSchema.index({ partnerId: 1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);