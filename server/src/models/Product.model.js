const mongoose = require("mongoose");

//variante
const variantSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      trim: true,
      required: [true, "El tamaño es obligatorio"],
    },
    color: {
      type: String,
      trim: true,
      required: [true, "El color es obligatorio"],
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, "El stock no puede ser negativo"],
    },
  },
  { _id: false }
);

//historial de precios
const priceHistorySchema = new mongoose.Schema(
  {
    price: {
      type: Number,
      required: [true, "El precio es obligatorio en el historial"],
      min: [0, "El precio no puede ser negativo"],
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [70, "El nombre no puede superar los 70 caracteres"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "La descripción no puede superar los 200 caracteres"],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "La categoría es obligatoria"],
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    variants: {
      type: [variantSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "Debe existir al menos una variante",
      },
    },
    percent: {
      type: Number,
      required: [true, "El porcentaje de ganancia es obligatorio"],
      min: [0, "El porcentaje no puede ser negativo"],
    },
    cost: {
      type: Number,
      required: [true, "El costo es obligatorio"],
      min: [0, "El costo no puede ser negativo"],
    },
    price: {
      type: Number,
      min: [0, "El precio no puede ser negativo"],
    },
    qrCode: {
      type: String,
      unique: true,
      sparse: true, // Permite valores nulos sin romper el índice único
    },
    priceHistory: [priceHistorySchema],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

productSchema.index({ name: 1, categoryId: 1 }, { unique: true });

const ProductModel = mongoose.model("Product", productSchema);

module.exports = ProductModel;
