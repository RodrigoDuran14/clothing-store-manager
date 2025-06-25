const mongoose = require('mongoose')

//variante
const variantSchema = new mongoose.Schema({
  size: String,
  color: String,
  stock: Number
},{_id: false})

//historial de precios
const priceHistorySchema = new mongoose.Schema({
  price: Number,
  date: Date
}, {_id: false})

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  categoryId: {type: mongoose.Schema.Types.ObjectId, ref: 'Category'},
  supplierId: {type: mongoose.Schema.Types.ObjectId, ref: 'Supplier'},
  variants: [variantSchema],
  price: Number,
  cost: Number,
  barcode: {type: String, unique: true},
  priceHistory: [priceHistorySchema],
  createdAt: {type: Date, default: Date.now}
}, {timestamps: true})

productSchema.index({barcode: 1})

module.exports = mongoose.model('Product', productSchema)