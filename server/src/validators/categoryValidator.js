const { body, param } = require('express-validator');

const validateCreateCategory = [
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 50 }).withMessage('El nombre no puede exceder 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras y espacios'),
  body('descripcion')
    .optional()
    .isLength({ max: 200 }).withMessage('La descripción no puede exceder 200 caracteres'),
  body('padre_id')
    .optional()
    .isMongoId().withMessage('ID de categoría padre inválido'),
  body('orden')
    .optional()
    .isInt({ min: 0 }).withMessage('El orden debe ser un número entero no negativo'),
  body('destacada')
    .optional()
    .isBoolean().withMessage('destacada debe ser true o false'),
  body('icono')
    .optional()
    .isString().withMessage('El icono debe ser texto')
];

const validateUpdateCategory = [
  param('id').isMongoId().withMessage('ID de categoría inválido'),
  body('nombre')
    .optional()
    .isLength({ max: 50 }).withMessage('El nombre no puede exceder 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras y espacios'),
  body('descripcion')
    .optional()
    .isLength({ max: 200 }).withMessage('La descripción no puede exceder 200 caracteres'),
  body('padre_id')
    .optional()
    .isMongoId().withMessage('ID de categoría padre inválido'),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false'),
  body('destacada')
    .optional()
    .isBoolean().withMessage('destacada debe ser true o false')
];

const validateReorderCategories = [
  body('categories')
    .isArray().withMessage('Se requiere un array de categorías')
    .notEmpty().withMessage('El array no puede estar vacío'),
  body('categories.*.id')
    .isMongoId().withMessage('ID de categoría inválido'),
  body('categories.*.orden')
    .isInt({ min: 0 }).withMessage('El orden debe ser un número entero no negativo')
];

module.exports = {
  validateCreateCategory,
  validateUpdateCategory,
  validateReorderCategories
};