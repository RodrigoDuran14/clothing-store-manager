const mongoose = require('mongoose')

//movimientos inventario
const inventoryMovementSchema = new mongoose.Schema({
  type: {type: String, enum: ['in', 'out', 'adjustment']},
  quantity: Number,
  date: Date
}, {_id: false})

//inventario
const inventorySchema = new mongoose.Schema({
  productId: {type: mongoose.Schema.Types.ObjectId, ref: 'Product'},
  movements: [inventoryMovementSchema]
}, {timestamps: true})

module.exports = mongoose.model('Inventory', inventorySchema)