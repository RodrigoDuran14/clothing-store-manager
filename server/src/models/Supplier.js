const mongoose = require('mongoose')

//proveedor
const supplierSchema = new mongoose.Schema({
  name: String,
  contact: String,
  phone: String,
  email: String,
  suppliedProducts: [{type: mongoose.Schema.Types.ObjectId, ref: 'Product'}]
}, {timestamps: true})

module.exports = mongoose.model('Supplier', supplierSchema)