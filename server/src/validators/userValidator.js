const { body, param, query } = require('express-validator');

/**
 * Validador para crear usuario (admin)
 */
const validateCreateUser = [
  body('name')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .trim(),
  
  body('email')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase(),
  
  body('password')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  
  body('phone')
    .optional()
    .isLength({ max: 20 }).withMessage('El teléfono no puede exceder 20 caracteres')
    .trim(),
  
  body('isAdmin')
    .optional()
    .isBoolean().withMessage('isAdmin debe ser true o false')
    .toBoolean(),
  
  body('image')
    .optional()
    .isURL().withMessage('La imagen debe ser una URL válida')
    .trim()
];

/**
 * Validador para actualizar usuario (admin)
 */
const validateUpdateUser = [
  param('id')
    .isMongoId().withMessage('ID de usuario inválido'),
  
  body('name')
    .optional()
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .trim(),
  
  body('email')
    .optional()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase(),
  
  body('phone')
    .optional()
    .isLength({ max: 20 }).withMessage('El teléfono no puede exceder 20 caracteres')
    .trim(),
  
  body('isAdmin')
    .optional()
    .isBoolean().withMessage('isAdmin debe ser true o false')
    .toBoolean(),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive debe ser true o false')
    .toBoolean(),
  
  body('image')
    .optional()
    .isURL().withMessage('La imagen debe ser una URL válida')
    .trim()
];

/**
 * Validador para actualizar perfil propio
 */
const validateUpdateMyProfile = [
  body('name')
    .optional()
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .trim(),
  
  body('email')
    .optional()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase(),
  
  body('phone')
    .optional()
    .isLength({ max: 20 }).withMessage('El teléfono no puede exceder 20 caracteres')
    .trim(),
  
  body('image')
    .optional()
    .isURL().withMessage('La imagen debe ser una URL válida')
    .trim()
];

/**
 * Validador para cambiar contraseña
 */
const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('La contraseña actual es obligatoria'),
  
  body('newPassword')
    .notEmpty().withMessage('La nueva contraseña es obligatoria')
    .isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
];

/**
 * Validador para obtener usuario por ID
 */
const validateGetUser = [
  param('id')
    .isMongoId().withMessage('ID de usuario inválido')
];

/**
 * Validador para eliminar usuario
 */
const validateDeleteUser = [
  param('id')
    .isMongoId().withMessage('ID de usuario inválido')
];

/**
 * Validador para listar usuarios con query params
 */
const validateListUsers = [
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
  
  query('isAdmin')
    .optional()
    .isBoolean().withMessage('isAdmin debe ser true o false')
    .toBoolean(),
  
  query('search')
    .optional()
    .isString().withMessage('search debe ser texto')
    .trim()
];

/**
 * Validador para reactivar usuario
 */
const validateReactivateUser = [
  param('id')
    .isMongoId().withMessage('ID de usuario inválido')
];

/**
 * Validador para actualizar último login
 */
const validateUpdateLastLogin = [
  param('id')
    .isMongoId().withMessage('ID de usuario inválido')
];

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateUpdateMyProfile,
  validateChangePassword,
  validateGetUser,
  validateDeleteUser,
  validateListUsers,
  validateReactivateUser,
  validateUpdateLastLogin
};