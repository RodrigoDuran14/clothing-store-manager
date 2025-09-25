const mongoose = require("mongoose");

//movimientos inventario
const inventoryMovementSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["in", "out", "adjustment"],
      required: [true, "El tipo de movimiento es obligatorio"],
    },
    quantity: {
      type: Number,
      required: [true, "La cantidad es obligatoria"],
      min: [1, "La cantidad debe ser mayor a 0"],
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

//inventario
const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "El producto es obligatorio"],
      unique: true, // cada producto tendrá un solo registro de inventario
    },
    movements: {
      type: [inventoryMovementSchema],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

inventorySchema.index({ productId: 1 }, { unique: true });

const inventoryModel = mongoose.model("Inventory", inventorySchema);

module.exports = inventoryModel;
