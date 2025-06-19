const mongoose = require('mongoose')

//compra
const purchaseSchema = new mongoose.Schema({
  saleId: {type: mongoose.Schema.Types.ObjectId, ref: 'Sale'},
  date: Date,
  total: Number
}, {_id: false})

//transacciones
const transactionSchema = new mongoose.Schema({
  type: {type: String, enum: ['payment', 'adjustment']},
  amount: Number,
  date: Date
}, {_id: false})

//cuenta corriente
const accountSchema = new mongoose.Schema({
  enabled: Boolean,
  creditLimit: Number,
  balance: Number,
  transactions: [transactionSchema]
}, {_id: false})

//cliente
const customerSchema = new mongoose.Schema({
  name: String,
  email: {type: String, unique: true},
  phone: String,
  addresses: [String],
  purchaseHistory: [purchaseSchema],
  account: accountSchema
}, {timestamps: true})

customerSchema.index({email: 1})

module.exports = mongoose.model('Customer', customerSchema)