const mongoose = require('mongoose')

//cierre de caja
const dailyClosingSchema = new mongoose.Schema({
  date: Date,
  totalSales: Number,
  cashInHand: [{partnerId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, amount: Number}],
  pendingTransfers: [{partnerId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, amount: Number}]
}, {timestamps: true})

module.exports = mongoose.model('DailyClosing', dailyClosingSchema)