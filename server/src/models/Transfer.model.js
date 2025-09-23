const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema(
  {
    originPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El socio origen es obligatorio"],
    },
    targetPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El socio destino es obligatorio"],
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
    method: {
      type: String,
      required: [true, "El método de transferencia es obligatorio"],
      enum: ["cash", "bank", "other"],
    },
  },
  { timestamps: true }
);

transferSchema.index({ originPartnerId: 1, targetPartnerId: 1, date: -1 });

const TransferModel = mongoose.model("Transfer", transferSchema);

module.exports = TransferModel;
