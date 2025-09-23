const mongoose = require("mongoose");

// montos por socio
const partnerAmountSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El socio es obligatorio"],
    },
    amount: {
      type: Number,
      required: [true, "El monto es obligatorio"],
      min: [0, "El monto no puede ser negativo"],
    },
  },
  { _id: false }
);

//cierre de caja
const dailyClosingSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "La fecha del cierre es obligatoria"],
      unique: true, // solo un cierre por día
    },
    totalSales: {
      type: Number,
      required: [true, "El total de ventas es obligatorio"],
      min: [0, "El total de ventas no puede ser negativo"],
    },
    cashInHand: {
      type: [partnerAmountSchema],
      default: [],
    },
    pendingTransfers: {
      type: [partnerAmountSchema],
      default: [],
    },
  },
  { timestamps: true }
);

dailyClosingSchema.index({ date: 1 }, { unique: true });

const DailyClosingModel = mongoose.model("DailyClosing", dailyClosingSchema);

module.exports = DailyClosingModel;
