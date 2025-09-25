const mongoose = require("mongoose");

//proveedor
const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre del proveedor es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [50, "El nombre no puede superar los 50 caracteres"],
    },
    contact: {
      type: String,
      trim: true,
      maxlength: [
        50,
        "El nombre de contacto no puede superar los 50 caracteres",
      ],
    },
    phone: {
      type: String,
      trim: true,
      match: [
        /^\+?[0-9\s-]{7,20}$/,
        "El número de teléfono debe ser válido (ej: +54 381 1234567)",
      ],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      match: [
        /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
        "El formato de email es inválido",
      ],
    },
    suppliedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

supplierSchema.index({ name: 1, email: 1 }, { unique: true });

const SupplierModel = mongoose.model("Supplier", supplierSchema);
module.exports = SupplierModel;
