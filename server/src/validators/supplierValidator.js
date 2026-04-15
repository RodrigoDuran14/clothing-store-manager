const { body, param, query } = require('express-validator');

/**
 * Validador para crear un nuevo proveedor
 */
const validateCreateSupplier = [
  body('name')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .trim(),
  
  body('contactName')
    .optional()
    .isLength({ max: 100 }).withMessage('El nombre de contacto no puede exceder 100 caracteres')
    .trim(),
  
  body('phone')
    .notEmpty().withMessage('El teléfono es obligatorio')
    .matches(/^[0-9+\-\s()]{8,20}$/).withMessage('Teléfono inválido')
    .trim(),
  
  body('phone2')
    .optional()
    .matches(/^[0-9+\-\s()]{8,20}$/).withMessage('Teléfono alternativo inválido')
    .trim(),
  
  body('email')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase(),
  
  body('address')
    .optional()
    .isObject().withMessage('address debe ser un objeto'),
  
  body('address.street')
    .optional()
    .trim(),
  
  body('address.number')
    .optional()
    .trim(),
  
  body('address.locality')
    .optional()
    .trim(),
  
  body('address.city')
    .optional()
    .trim(),
  
  body('address.province')
    .optional()
    .trim(),
  
  body('taxId')
    .optional()
    .matches(/^\d{2}-\d{8}-\d{1}$/).withMessage('Formato de CUIT inválido (ej: 20-12345678-9)')
    .trim(),
  
  body('taxCondition')
    .optional()
    .isIn(['responsible', 'monotributist', 'final_consumer', 'exempt', 'non_responsible'])
    .withMessage('Condición fiscal inválida'),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 }).withMessage('Las notas no pueden exceder 1000 caracteres')
    .trim(),
  
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('La calificación debe ser entre 1 y 5')
    .toInt(),
  
  body('deliveryTime')
    .optional()
    .isInt({ min: 0 }).withMessage('El tiempo de entrega debe ser un número positivo')
    .toInt(),
  
  body('paymentTerms')
    .optional()
    .isIn(['cash', '15_days', '30_days', '60_days', '90_days'])
    .withMessage('Condición de pago inválida'),
  
  body('bankInfo')
    .optional()
    .isObject().withMessage('bankInfo debe ser un objeto'),
  
  body('bankInfo.bankName')
    .optional()
    .trim(),
  
  body('bankInfo.accountNumber')
    .optional()
    .trim(),
  
  body('bankInfo.cbu')
    .optional()
    .trim(),
  
  body('bankInfo.alias')
    .optional()
    .trim()
];

/**
 * Validador para actualizar un proveedor existente
 */
const validateUpdateSupplier = [
  param('id')
    .isMongoId().withMessage('ID de proveedor inválido'),
  
  body('name')
    .optional()
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .trim(),
  
  body('phone')
    .optional()
    .matches(/^[0-9+\-\s()]{8,20}$/).withMessage('Teléfono inválido')
    .trim(),
  
  body('email')
    .optional()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase(),
  
  body('taxId')
    .optional()
    .matches(/^\d{2}-\d{8}-\d{1}$/).withMessage('Formato de CUIT inválido (ej: 20-12345678-9)')
    .trim(),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive debe ser true o false')
    .toBoolean(),
  
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('La calificación debe ser entre 1 y 5')
    .toInt(),
  
  body('deliveryTime')
    .optional()
    .isInt({ min: 0 }).withMessage('El tiempo de entrega debe ser un número positivo')
    .toInt(),
  
  body('paymentTerms')
    .optional()
    .isIn(['cash', '15_days', '30_days', '60_days', '90_days'])
    .withMessage('Condición de pago inválida'),
  
  body('taxCondition')
    .optional()
    .isIn(['responsible', 'monotributist', 'final_consumer', 'exempt', 'non_responsible'])
    .withMessage('Condición fiscal inválida'),
  
  body('debt')
    .optional()
    .isFloat({ min: 0 }).withMessage('La deuda debe ser un número positivo')
    .toFloat()
];

/**
 * Validador para agregar producto a proveedor
 */
const validateAddProduct = [
  param('id')
    .isMongoId().withMessage('ID de proveedor inválido'),
  
  body('productId')
    .isMongoId().withMessage('ID de producto inválido')
];

/**
 * Validador para registrar compra
 */
const validateRecordPurchase = [
  param('id')
    .isMongoId().withMessage('ID de proveedor inválido'),
  
  body('amount')
    .isFloat({ min: 0.01 }).withMessage('El monto debe ser mayor a 0')
    .toFloat(),
  
  body('updateDebt')
    .optional()
    .isBoolean().withMessage('updateDebt debe ser true o false')
    .toBoolean()
];

/**
 * Validador para actualizar deuda
 */
const validateUpdateDebt = [
  param('id')
    .isMongoId().withMessage('ID de proveedor inválido'),
  
  body('amount')
    .isFloat({ min: 0.01 }).withMessage('El monto debe ser mayor a 0')
    .toFloat(),
  
  body('type')
    .optional()
    .isIn(['increase', 'decrease']).withMessage('type debe ser increase o decrease')
];

/**
 * Validador para obtener proveedores con filtros
 */
const validateGetSuppliers = [
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
  
  query('rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('rating debe ser un número entre 1 y 5')
    .toInt(),
  
  query('taxCondition')
    .optional()
    .isIn(['responsible', 'monotributist', 'final_consumer', 'exempt', 'non_responsible'])
    .withMessage('taxCondition inválido'),
  
  query('paymentTerms')
    .optional()
    .isIn(['cash', '15_days', '30_days', '60_days', '90_days'])
    .withMessage('paymentTerms inválido'),
  
  query('orderBy')
    .optional()
    .isIn(['name', 'rating', 'totalPurchases', 'lastPurchase', 'debt'])
    .withMessage('orderBy inválido'),
  
  query('search')
    .optional()
    .isString().withMessage('search debe ser texto')
    .trim()
];

/**
 * Validador para obtener top proveedores
 */
const validateGetTopSuppliers = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('limit debe ser un número entre 1 y 50')
    .toInt()
];

/**
 * Validador para eliminar producto de proveedor
 */
const validateRemoveProduct = [
  param('id')
    .isMongoId().withMessage('ID de proveedor inválido'),
  
  param('productId')
    .isMongoId().withMessage('ID de producto inválido')
];

module.exports = {
  validateCreateSupplier,
  validateUpdateSupplier,
  validateAddProduct,
  validateRecordPurchase,
  validateUpdateDebt,
  validateGetSuppliers,
  validateGetTopSuppliers,
  validateRemoveProduct
};