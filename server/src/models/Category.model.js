const mongoose = require("mongoose");

//categoria
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre de la categoría es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [20, "El nombre no puede superar los 20 caracteres"],
    },
    description: {
      type: String,
      maxlength: [100, "La descripción no puede superar los 100 caracteres"],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const CategoryModel = mongoose.model("Category", categorySchema);

module.exports = CategoryModel;
