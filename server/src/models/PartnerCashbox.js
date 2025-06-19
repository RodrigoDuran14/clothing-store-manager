const mongoose = require("mongoose");

//operacion de caja
const cashboxTransactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["income", "expense"] },
    amount: Number,
    date: Date,
    description: String,
  },
  { _id: false }
);

const partnerCashboxSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    balance: Number,
    transactions: [cashboxTransactionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("PartnerCashBox", partnerCashboxSchema);