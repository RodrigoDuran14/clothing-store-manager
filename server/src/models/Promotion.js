const mongoose = require('mongoose')

//promociones
const promotionSchema = new mongoose.Schema({
  name: String,
  description: String,
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  startDate: Date,
  endDate: Date
}, { timestamps: true });

module.exports = mongoose.model('Promotion', promotionSchema);