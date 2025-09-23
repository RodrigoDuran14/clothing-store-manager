const mongoose = require("mongoose");

//promociones
const promotionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre de la promoción es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [70, "El nombre no puede superar los 70 caracteres"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "La descripción no puede superar los 200 caracteres"],
    },
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: [true, "Debe haber al menos un producto aplicable"],
      },
    ],
    startDate: {
      type: Date,
      required: [true, "La fecha de inicio es obligatoria"],
    },
    endDate: {
      type: Date,
      required: [true, "La fecha de fin es obligatoria"],
      validate: {
        validator: function (value) {
          return !this.startDate || value >= this.startDate;
        },
        message: "La fecha de fin debe ser mayor o igual a la de inicio",
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

promotionSchema.index({ active: 1, startDate: 1, endDate: 1 });

const PromotionModel = mongoose.model("Promotion", promotionSchema);

module.exports = PromotionModel;