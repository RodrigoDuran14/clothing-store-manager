const mongoose = require("mongoose");

//ajuste socio
const PartnerAdjustmentSchema = new mongoose.Schema(
  {
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: [true, "La venta asociada es obligatoria"],
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El socio asociado es obligatorio"],
    },
    amount: {
      type: Number,
      required: [true, "El monto es obligatorio"],
      min: [0, "El monto no puede ser negativo"],
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: [true, "El tipo de ajuste es obligatorio"],
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const PartnerAdjustmentModel = mongoose.model(
  "PartnerAdjustment",
  PartnerAdjustmentSchema
);

module.exports = PartnerAdjustmentModel;
