const mongoose = require("mongoose");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validatePostProduct = (req, res, next) => {
  const { name, categoryId, supplierId, variants, percent, cost } = req.body;
  const errors = [];

  if (!name || typeof name !== "string" || name.trim().length < 3) {
    errors.push("El nombre es obligatorio y debe tener al menos 3 caracteres.");
  }

  if (!categoryId || !isValidObjectId(categoryId)) {
    errors.push("La categoría es obligatoria y debe ser un ObjectId válido.");
  }

  if (supplierId && !isValidObjectId(supplierId)) {
    errors.push("El proveedor debe ser un ObjectId válido.");
  }

  if (!variants || !Array.isArray(variants) || variants.length === 0) {
    errors.push("Debe haber al menos una variante.");
  } else {
    variants.forEach((variant, i) => {
      if (!variant.size || typeof variant.size !== "string" || variant.size.trim().length === 0) {
        errors.push(`La variante #${i + 1} debe tener un tamaño válido.`);
      }
      if (!variant.color || typeof variant.color !== "string" || variant.color.trim().length === 0) {
        errors.push(`La variante #${i + 1} debe tener un color válido.`);
      }
      if (variant.stock != null && (typeof variant.stock !== "number" || variant.stock < 0)) {
        errors.push(`La variante #${i + 1} debe tener un stock numérico mayor o igual a 0.`);
      }
    });
  }

  if (percent == null || typeof percent !== "number" || percent < 0) {
    errors.push("El porcentaje es obligatorio y debe ser un número mayor o igual a 0.");
  }

  if (cost == null || typeof cost !== "number" || cost < 0) {
    errors.push("El costo es obligatorio y debe ser un número mayor o igual a 0.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

module.exports = { validatePostProduct };
