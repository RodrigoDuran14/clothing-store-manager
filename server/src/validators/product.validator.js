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

const validateUpdateProduct = (req, res, next) => {
  const {
    name,
    categoryId,
    supplierId,
    variants,
    percent,
    cost,
    price,
    active,
  } = req.body;
  const errors = [];

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 3) {
      errors.push("El nombre debe ser un texto con al menos 3 caracteres.");
    }
    if (name.trim().length > 70) {
      errors.push("El nombre no puede superar los 70 caracteres.");
    }
  }

  if (categoryId !== undefined && !isValidObjectId(categoryId)) {
    errors.push("El ID de categoría debe ser un ObjectId válido.");
  }

  if (supplierId !== undefined && !isValidObjectId(supplierId)) {
    errors.push("El ID de proveedor debe ser un ObjectId válido.");
  }

  if (variants !== undefined) {
    if (!Array.isArray(variants) || variants.length === 0) {
      errors.push("Las variantes deben ser un arreglo con al menos una variante.");
    } else {
      variants.forEach((variant, i) => {
        if (
          !variant.size ||
          typeof variant.size !== "string" ||
          variant.size.trim().length === 0
        ) {
          errors.push(`La variante #${i + 1} debe tener un tamaño válido.`);
        }
        if (
          !variant.color ||
          typeof variant.color !== "string" ||
          variant.color.trim().length === 0
        ) {
          errors.push(`La variante #${i + 1} debe tener un color válido.`);
        }
        if (
          variant.stock != null &&
          (typeof variant.stock !== "number" || variant.stock < 0)
        ) {
          errors.push(
            `La variante #${i + 1} debe tener un stock numérico mayor o igual a 0.`
          );
        }
      });
    }
  }

  if (percent !== undefined) {
    if (typeof percent !== "number" || percent < 0) {
      errors.push("El porcentaje debe ser un número mayor o igual a 0.");
    }
  }

  if (cost !== undefined) {
    if (typeof cost !== "number" || cost < 0) {
      errors.push("El costo debe ser un número mayor o igual a 0.");
    }
  }

  if (price !== undefined) {
    if (typeof price !== "number" || price < 0) {
      errors.push("El precio debe ser un número mayor o igual a 0.");
    }
  }

  if (active !== undefined && typeof active !== "boolean") {
    errors.push("El campo 'active' debe ser true o false.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

module.exports = { validatePostProduct, validateUpdateProduct };
