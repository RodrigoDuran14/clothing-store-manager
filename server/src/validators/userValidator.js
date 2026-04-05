const { body, param, query } = require('express-validator');

// Validación para crear usuario (admin)
const validateCreateUser = [
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres'),
  body('email')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('telefono')
    .optional()
    .isLength({ max: 20 }).withMessage('Teléfono inválido'),
  body('admin')
    .optional()
    .isBoolean().withMessage('admin debe ser true o false')
];

// Validación para actualizar usuario
const validateUpdateUser = [
  param('id')
    .isMongoId().withMessage('ID de usuario inválido'),
  body('nombre')
    .optional()
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres'),
  body('email')
    .optional()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('telefono')
    .optional()
    .isLength({ max: 20 }).withMessage('Teléfono inválido'),
  body('admin')
    .optional()
    .isBoolean().withMessage('admin debe ser true o false'),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false')
];

// Validación para obtener usuario por ID
const validateGetUser = [
  param('id')
    .isMongoId().withMessage('ID de usuario inválido')
];

// Validación para eliminar usuario
const validateDeleteUser = [
  param('id')
    .isMongoId().withMessage('ID de usuario inválido')
];

// Validación para listar usuarios con query params
const validateListUsers = [
  query('pagina')
    .optional()
    .isInt({ min: 1 }).withMessage('La página debe ser un número positivo'),
  query('limite')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('El límite debe ser entre 1 y 100'),
  query('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false'),
  query('admin')
    .optional()
    .isBoolean().withMessage('admin debe ser true o false'),
  query('search')
    .optional()
    .isString().withMessage('search debe ser texto')
];

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateGetUser,
  validateDeleteUser,
  validateListUsers
};