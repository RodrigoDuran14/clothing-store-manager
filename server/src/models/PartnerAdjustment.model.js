const mongoose = require("mongoose");

//ajuste socio
const PartnerAdjustmentSchema = new mongoose.Schema(
  {
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: Number,
    type: { type: String, enum: ["credit", "debit"] },
    date: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PartnerAdjustment", partnerAdjustmentSchema);
