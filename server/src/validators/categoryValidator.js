const { body, param, query } = require('express-validator');

/**
 * Validador para crear una nueva categoría
 */
const validateCreateCategory = [
  body('name')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 50 }).withMessage('El nombre no puede exceder 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras y espacios')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 200 }).withMessage('La descripción no puede exceder 200 caracteres')
    .trim(),
  
  body('image')
    .optional()
    .isURL().withMessage('La imagen debe ser una URL válida')
    .trim(),
  
  body('parentId')
    .optional()
    .isMongoId().withMessage('ID de categoría padre inválido'),
  
  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('El orden debe ser un número entero no negativo')
    .toInt(),
  
  body('isFeatured')
    .optional()
    .isBoolean().withMessage('isFeatured debe ser true o false')
    .toBoolean(),
  
  body('icon')
    .optional()
    .isString().withMessage('El icono debe ser texto')
    .trim()
];

/**
 * Validador para actualizar una categoría existente
 */
const validateUpdateCategory = [
  param('id')
    .isMongoId().withMessage('ID de categoría inválido'),
  
  body('name')
    .optional()
    .isLength({ max: 50 }).withMessage('El nombre no puede exceder 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras y espacios')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 200 }).withMessage('La descripción no puede exceder 200 caracteres')
    .trim(),
  
  body('image')
    .optional()
    .isURL().withMessage('La imagen debe ser una URL válida')
    .trim(),
  
  body('parentId')
    .optional()
    .isMongoId().withMessage('ID de categoría padre inválido')
    .custom((value, { req }) => {
      if (value === req.params.id) {
        throw new Error('Una categoría no puede ser padre de sí misma');
      }
      return true;
    }),
  
  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('El orden debe ser un número entero no negativo')
    .toInt(),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive debe ser true o false')
    .toBoolean(),
  
  body('isFeatured')
    .optional()
    .isBoolean().withMessage('isFeatured debe ser true o false')
    .toBoolean(),
  
  body('icon')
    .optional()
    .isString().withMessage('El icono debe ser texto')
    .trim()
];

/**
 * Validador para reordenar categorías
 */
const validateReorderCategories = [
  body('categories')
    .isArray().withMessage('Se requiere un array de categorías')
    .notEmpty().withMessage('El array no puede estar vacío'),
  
  body('categories.*.id')
    .isMongoId().withMessage('ID de categoría inválido'),
  
  body('categories.*.order')
    .isInt({ min: 0 }).withMessage('El orden debe ser un número entero no negativo')
    .toInt()
];

/**
 * Validador para obtener categorías con filtros
 */
const validateGetCategories = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page debe ser un número entero positivo')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit debe ser un número entre 1 y 100')
    .toInt(),
  
  query('isActive')
    .optional()
    .isBoolean().withMessage('isActive debe ser true o false')
    .toBoolean(),
  
  query('tree')
    .optional()
    .isBoolean().withMessage('tree debe ser true o false')
    .toBoolean(),
  
  query('forSelect')
    .optional()
    .isBoolean().withMessage('forSelect debe ser true o false')
    .toBoolean()
];

/**
 * Validador para obtener categoría por ID
 */
const validateGetCategoryById = [
  param('id')
    .isMongoId().withMessage('ID de categoría inválido')
];

/**
 * Validador para eliminar categoría
 */
const validateDeleteCategory = [
  param('id')
    .isMongoId().withMessage('ID de categoría inválido')
];

/**
 * Validador para obtener subcategorías
 */
const validateGetSubcategories = [
  param('id')
    .isMongoId().withMessage('ID de categoría inválido')
];

/**
 * Validador para obtener breadcrumb
 */
const validateGetBreadcrumb = [
  param('id')
    .isMongoId().withMessage('ID de categoría inválido')
];

/**
 * Validador para toggle de estado
 */
const validateToggleStatus = [
  param('id')
    .isMongoId().withMessage('ID de categoría inválido')
];

module.exports = {
  validateCreateCategory,
  validateUpdateCategory,
  validateReorderCategories,
  validateGetCategories,
  validateGetCategoryById,
  validateDeleteCategory,
  validateGetSubcategories,
  validateGetBreadcrumb,
  validateToggleStatus
};