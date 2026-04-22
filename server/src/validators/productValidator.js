const { body, param, query } = require('express-validator');

/**
 * Validador para crear un nuevo producto
 */
const validateCreateProduct = [
  body('name')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 200 }).withMessage('El nombre no puede exceder 200 caracteres')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 2000 }).withMessage('La descripción no puede exceder 2000 caracteres')
    .trim(),
  
  body('categoryId')
    .notEmpty().withMessage('La categoría es obligatoria')
    .isMongoId().withMessage('ID de categoría inválido'),
  
  body('supplierId')
    .notEmpty().withMessage('El proveedor es obligatorio')
    .isMongoId().withMessage('ID de proveedor inválido'),
  
  body('price')
    .notEmpty().withMessage('El precio es obligatorio')
    .isFloat({ min: 0 }).withMessage('El precio debe ser un número mayor o igual a 0')
    .toFloat(),
  
  body('webPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('El precio web debe ser un número mayor o igual a 0')
    .toFloat(),
  
  body('cost')
    .notEmpty().withMessage('El costo es obligatorio')
    .isFloat({ min: 0 }).withMessage('El costo debe ser un número mayor o igual a 0')
    .toFloat(),
  
  body('variants')
    .optional()
    .isArray().withMessage('variants debe ser un array'),
  
  body('variants.*.size')
    .notEmpty().withMessage('El talle es obligatorio para cada variante')
    .trim(),
  
  body('variants.*.color')
    .notEmpty().withMessage('El color es obligatorio para cada variante')
    .trim(),
  
  body('variants.*.stock')
    .optional()
    .isInt({ min: 0 }).withMessage('El stock debe ser un número entero no negativo')
    .toInt(),
  
  body('variants.*.minStock')
    .optional()
    .isInt({ min: 0 }).withMessage('El stock mínimo debe ser un número entero no negativo')
    .toInt(),
  
  body('variants.*.sku')
    .optional()
    .trim(),
  
  body('barcode')
    .optional()
    .isLength({ max: 50 }).withMessage('El código de barras no puede exceder 50 caracteres')
    .trim(),
  
  body('images')
    .optional()
    .isArray().withMessage('images debe ser un array'),
  
  body('images.*.url')
    .optional()
    .isURL().withMessage('La URL de la imagen debe ser válida'),
  
  body('isFeatured')
    .optional()
    .isBoolean().withMessage('isFeatured debe ser true o false')
    .toBoolean(),
  
  body('isVisibleOnWeb')
    .optional()
    .isBoolean().withMessage('isVisibleOnWeb debe ser true o false')
    .toBoolean(),
  
  body('weightKg')
    .optional()
    .isFloat({ min: 0 }).withMessage('El peso debe ser un número mayor o igual a 0')
    .toFloat(),
  
  body('tags')
    .optional()
    .isArray().withMessage('tags debe ser un array'),
  
  body('tags.*')
    .optional()
    .isString().withMessage('Cada tag debe ser texto')
    .trim()
];

/**
 * Validador para actualizar un producto existente
 */
const validateUpdateProduct = [
  param('id')
    .isMongoId().withMessage('ID de producto inválido'),
  
  body('name')
    .optional()
    .isLength({ max: 200 }).withMessage('El nombre no puede exceder 200 caracteres')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 2000 }).withMessage('La descripción no puede exceder 2000 caracteres')
    .trim(),
  
  body('categoryId')
    .optional()
    .isMongoId().withMessage('ID de categoría inválido'),
  
  body('supplierId')
    .optional()
    .isMongoId().withMessage('ID de proveedor inválido'),
  
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('El precio debe ser un número mayor o igual a 0')
    .toFloat(),
  
  body('webPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('El precio web debe ser un número mayor o igual a 0')
    .toFloat(),
  
  body('cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('El costo debe ser un número mayor o igual a 0')
    .toFloat(),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive debe ser true o false')
    .toBoolean(),
  
  body('isFeatured')
    .optional()
    .isBoolean().withMessage('isFeatured debe ser true o false')
    .toBoolean(),
  
  body('isVisibleOnWeb')
    .optional()
    .isBoolean().withMessage('isVisibleOnWeb debe ser true o false')
    .toBoolean(),
  
  body('barcode')
    .optional()
    .isLength({ max: 50 }).withMessage('El código de barras no puede exceder 50 caracteres')
    .trim(),
  
  body('weightKg')
    .optional()
    .isFloat({ min: 0 }).withMessage('El peso debe ser un número mayor o igual a 0')
    .toFloat()
];

/**
 * Validador para actualizar stock de una variante
 */
const validateUpdateStock = [
  param('id')
    .isMongoId().withMessage('ID de producto inválido'),
  
  body('size')
    .notEmpty().withMessage('El talle es obligatorio')
    .trim(),
  
  body('color')
    .notEmpty().withMessage('El color es obligatorio')
    .trim(),
  
  body('quantity')
    .notEmpty().withMessage('La cantidad es obligatoria')
    .isInt({ min: 0 }).withMessage('La cantidad debe ser un número entero no negativo')
    .toInt(),
  
  body('type')
    .optional()
    .isIn(['sale', 'purchase', 'return', 'adjustment'])
    .withMessage('El tipo debe ser: sale, purchase, return o adjustment')
];

/**
 * Validador para obtener productos con filtros
 */
const validateGetProducts = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page debe ser un número entero positivo')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit debe ser un número entre 1 y 100')
    .toInt(),
  
  query('categoryId')
    .optional()
    .isMongoId().withMessage('categoryId debe ser un ID válido'),
  
  query('supplierId')
    .optional()
    .isMongoId().withMessage('supplierId debe ser un ID válido'),
  
  query('isActive')
    .optional()
    .isBoolean().withMessage('isActive debe ser true o false')
    .toBoolean(),
  
  query('isFeatured')
    .optional()
    .isBoolean().withMessage('isFeatured debe ser true o false')
    .toBoolean(),
  
  query('isVisibleOnWeb')
    .optional()
    .isBoolean().withMessage('isVisibleOnWeb debe ser true o false')
    .toBoolean(),
  
  query('lowStock')
    .optional()
    .isBoolean().withMessage('lowStock debe ser true o false')
    .toBoolean(),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('minPrice debe ser un número positivo')
    .toFloat(),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('maxPrice debe ser un número positivo')
    .toFloat(),
  
  query('minStock')
    .optional()
    .isInt({ min: 0 }).withMessage('minStock debe ser un número entero no negativo')
    .toInt(),
  
  query('search')
    .optional()
    .isString().withMessage('search debe ser texto')
    .trim()
];

/**
 * Validador para verificar stock
 */
const validateCheckStock = [
  param('id')
    .isMongoId().withMessage('ID de producto inválido'),
  
  query('size')
    .notEmpty().withMessage('El talle es obligatorio')
    .trim(),
  
  query('color')
    .notEmpty().withMessage('El color es obligatorio')
    .trim(),
  
  query('quantity')
    .optional()
    .isInt({ min: 1 }).withMessage('La cantidad debe ser un número entero positivo')
    .toInt()
];

/**
 * Validador para agregar imagen
 */
const validateAddImage = [
  param('id')
    .isMongoId().withMessage('ID de producto inválido'),
  
  body('url')
    .notEmpty().withMessage('La URL de la imagen es obligatoria')
    .isURL().withMessage('La URL debe ser válida'),
  
  body('publicId')
    .optional()
    .trim(),
  
  body('isMain')
    .optional()
    .isBoolean().withMessage('isMain debe ser true o false')
    .toBoolean()
];

/**
 * Validador para eliminar imagen
 */
const validateDeleteImage = [
  param('id')
    .isMongoId().withMessage('ID de producto inválido'),
  
  param('imageId')
    .isMongoId().withMessage('ID de imagen inválido')
];

module.exports = {
  validateCreateProduct,
  validateUpdateProduct,
  validateUpdateStock,
  validateGetProducts,
  validateCheckStock,
  validateAddImage,
  validateDeleteImage
};