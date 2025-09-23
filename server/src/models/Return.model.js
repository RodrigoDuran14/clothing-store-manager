const mongoose = require("mongoose");

//devoluciones
const returnSchema = new mongoose.Schema(
  {
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: [true, "La venta asociada es obligatoria"],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "El producto es obligatorio"],
    },
    quantity: {
      type: Number,
      required: [true, "La cantidad devuelta es obligatoria"],
      min: [1, "La cantidad mínima a devolver es 1"],
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [200, "El motivo no puede superar los 200 caracteres"],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["pending", "processed", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

returnSchema.index({ status: 1, date: -1 });

const ReturnModel = mongoose.model("Return", returnSchema);

module.exports = ReturnModel;
