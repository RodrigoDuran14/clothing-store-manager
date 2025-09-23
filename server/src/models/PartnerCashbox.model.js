const mongoose = require("mongoose");

//operacion de caja
const cashboxTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["income", "expense"],
      required: [true, "El tipo de transacción es obligatorio"],
    },
    amount: {
      type: Number,
      required: [true, "El monto es obligatorio"],
      min: [0, "El monto no puede ser negativo"],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "La descripción no puede superar los 200 caracteres"],
    },
  },
  { _id: false }
);

const partnerCashboxSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El socio es obligatorio"],
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, "El balance no puede ser negativo"],
    },
    transactions: {
      type: [cashboxTransactionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

partnerCashboxSchema.index({ partnerId: 1 });

const PartnerCashBoxModel = mongoose.model("PartnerCashBox", partnerCashboxSchema);

module.exports = PartnerCashBoxModel;