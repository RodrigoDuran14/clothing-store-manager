const { body, param, query } = require('express-validator');

/**
 * Validador para crear un nuevo vendedor
 */
const validateCreateSeller = [
  body('firstName')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 50 }).withMessage('El nombre no puede exceder 50 caracteres')
    .trim(),
  
  body('lastName')
    .notEmpty().withMessage('El apellido es obligatorio')
    .isLength({ max: 50 }).withMessage('El apellido no puede exceder 50 caracteres')
    .trim(),
  
  body('email')
    .isEmail().withMessage('Formato de email inválido')
    .normalizeEmail()
    .toLowerCase(),
  
  body('phone')
    .notEmpty().withMessage('El teléfono es obligatorio')
    .matches(/^[0-9+\-\s()]{8,20}$/).withMessage('Teléfono inválido')
    .trim(),
  
  body('phone2')
    .optional()
    .matches(/^[0-9+\-\s()]{8,20}$/).withMessage('Teléfono alternativo inválido')
    .trim(),
  
  body('document')
    .optional()
    .isLength({ min: 7, max: 20 }).withMessage('Documento inválido')
    .trim(),
  
  body('documentType')
    .optional()
    .isIn(['DNI', 'CUIL', 'CUIT', 'PASSPORT', 'OTHER']).withMessage('Tipo de documento inválido'),
  
  body('birthDate')
    .optional()
    .isISO8601().withMessage('Fecha de nacimiento inválida')
    .toDate(),
  
  body('address')
    .optional()
    .isObject().withMessage('address debe ser un objeto'),
  
  body('position')
    .optional()
    .isIn(['salesperson', 'senior_salesperson', 'supervisor', 'manager'])
    .withMessage('Puesto inválido'),
  
  body('hireDate')
    .optional()
    .isISO8601().withMessage('Fecha de contratación inválida')
    .toDate(),
  
  body('commissionRate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('La tasa de comisión debe estar entre 0 y 100')
    .toFloat(),
  
  body('commissionType')
    .optional()
    .isIn(['percentage', 'fixed']).withMessage('commissionType debe ser percentage o fixed'),
  
  body('fixedCommissionAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('El monto fijo de comisión debe ser positivo')
    .toFloat(),
  
  body('commissionTiers')
    .optional()
    .isArray().withMessage('commissionTiers debe ser un array'),
  
  body('commissionTiers.*.minSales')
    .optional()
    .isFloat({ min: 0 }).withMessage('minSales debe ser un número positivo')
    .toFloat(),
  
  body('commissionTiers.*.maxSales')
    .optional()
    .isFloat({ min: 0 }).withMessage('maxSales debe ser un número positivo')
    .toFloat(),
  
  body('commissionTiers.*.rate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('rate debe estar entre 0 y 100')
    .toFloat(),
  
  body('shifts')
    .optional()
    .isArray().withMessage('shifts debe ser un array'),
  
  body('shifts.*.day')
    .optional()
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Día inválido'),
  
  body('shifts.*.startTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido (HH:MM)'),
  
  body('shifts.*.endTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido (HH:MM)'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Las notas no pueden exceder 500 caracteres')
    .trim(),
  
  body('userId')
    .optional()
    .isMongoId().withMessage('ID de usuario inválido')
];

/**
 * Validador para actualizar un vendedor existente
 */
const validateUpdateSeller = [
  param('id')
    .isMongoId().withMessage('ID de vendedor inválido'),
  
  body('firstName')
    .optional()
    .isLength({ max: 50 }).withMessage('El nombre no puede exceder 50 caracteres')
    .trim(),
  
  body('lastName')
    .optional()
    .isLength({ max: 50 }).withMessage('El apellido no puede exceder 50 caracteres')
    .trim(),
  
  body('email')
    .optional()
    .isEmail().withMessage('Formato de email inválido')
    .normalizeEmail()
    .toLowerCase(),
  
  body('phone')
    .optional()
    .matches(/^[0-9+\-\s()]{8,20}$/).withMessage('Teléfono inválido')
    .trim(),
  
  body('active')
    .optional()
    .isBoolean().withMessage('active debe ser true o false')
    .toBoolean(),
  
  body('position')
    .optional()
    .isIn(['salesperson', 'senior_salesperson', 'supervisor', 'manager'])
    .withMessage('Puesto inválido'),
  
  body('commissionRate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('La tasa de comisión debe estar entre 0 y 100')
    .toFloat(),
  
  body('commissionType')
    .optional()
    .isIn(['percentage', 'fixed']).withMessage('commissionType debe ser percentage o fixed'),
  
  body('fixedCommissionAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('El monto fijo de comisión debe ser positivo')
    .toFloat(),
  
  body('document')
    .optional()
    .isLength({ min: 7, max: 20 }).withMessage('Documento inválido')
    .trim(),
  
  body('userId')
    .optional()
    .isMongoId().withMessage('ID de usuario inválido'),
  
  body('terminationDate')
    .optional()
    .isISO8601().withMessage('Fecha de finalización inválida')
    .toDate()
];

/**
 * Validador para pagar comisión
 */
const validatePayCommission = [
  param('id')
    .isMongoId().withMessage('ID de vendedor inválido'),
  
  body('period')
    .notEmpty().withMessage('El período es obligatorio')
    .matches(/^\d{4}-\d{2}$/).withMessage('El período debe tener formato YYYY-MM')
    .trim(),
  
  body('amount')
    .isFloat({ min: 0.01 }).withMessage('El monto debe ser mayor a 0')
    .toFloat(),
  
  body('paymentReference')
    .optional()
    .isLength({ max: 100 }).withMessage('La referencia de pago no puede exceder 100 caracteres')
    .trim()
];

/**
 * Validador para obtener vendedores con filtros
 */
const validateGetSellers = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page debe ser un número entero positivo')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit debe ser un número entre 1 y 100')
    .toInt(),
  
  query('active')
    .optional()
    .isBoolean().withMessage('active debe ser true o false')
    .toBoolean(),
  
  query('position')
    .optional()
    .isIn(['salesperson', 'senior_salesperson', 'supervisor', 'manager'])
    .withMessage('position inválido'),
  
  query('orderBy')
    .optional()
    .isIn(['fullName', 'totalSales', 'monthlySales', 'commissionRate', 'totalCommission', 'salesCount'])
    .withMessage('orderBy inválido'),
  
  query('search')
    .optional()
    .isString().withMessage('search debe ser texto')
    .trim()
];

/**
 * Validador para obtener top vendedores
 */
const validateGetTopSellers = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('limit debe ser un número entre 1 y 50')
    .toInt(),
  
  query('period')
    .optional()
    .isIn(['monthly', 'total']).withMessage('period debe ser monthly o total')
];

/**
 * Validador para calcular comisiones
 */
const validateCalculateCommissions = [
  query('startDate')
    .notEmpty().withMessage('startDate es obligatorio')
    .isISO8601().withMessage('startDate debe ser una fecha válida')
    .toDate(),
  
  query('endDate')
    .notEmpty().withMessage('endDate es obligatorio')
    .isISO8601().withMessage('endDate debe ser una fecha válida')
    .toDate()
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate < new Date(req.query.startDate)) {
        throw new Error('endDate debe ser mayor o igual a startDate');
      }
      return true;
    })
];

/**
 * Validador para agregar turno
 */
const validateAddShift = [
  param('id')
    .isMongoId().withMessage('ID de vendedor inválido'),
  
  body('day')
    .notEmpty().withMessage('El día es obligatorio')
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Día inválido'),
  
  body('startTime')
    .notEmpty().withMessage('La hora de inicio es obligatoria')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido (HH:MM)'),
  
  body('endTime')
    .notEmpty().withMessage('La hora de fin es obligatoria')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido (HH:MM)')
    .custom((endTime, { req }) => {
      if (req.body.startTime && endTime <= req.body.startTime) {
        throw new Error('endTime debe ser mayor a startTime');
      }
      return true;
    }),
  
  body('active')
    .optional()
    .isBoolean().withMessage('active debe ser true o false')
    .toBoolean()
];

/**
 * Validador para eliminar turno
 */
const validateRemoveShift = [
  param('id')
    .isMongoId().withMessage('ID de vendedor inválido'),
  
  param('shiftId')
    .isMongoId().withMessage('ID de turno inválido')
];

module.exports = {
  validateCreateSeller,
  validateUpdateSeller,
  validatePayCommission,
  validateGetSellers,
  validateGetTopSellers,
  validateCalculateCommissions,
  validateAddShift,
  validateRemoveShift
};