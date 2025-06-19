const mongoose = require('mongoose')

//devoluciones
const returnSchema = new mongoose.Schema({
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: Number,
  reason: String,
  date: Date,
  status: { type: String, enum: ['pending', 'processed', 'rejected'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Return', returnSchema);
