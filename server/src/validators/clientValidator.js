const { body, param, query } = require('express-validator');

/**
 * Validador para crear un nuevo cliente
 * Verifica que todos los campos obligatorios estén presentes y tengan formato correcto
 */
const validateCreateClient = [
  body('name')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .trim(),
  
  body('email')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase(),
  
  body('phone')
    .notEmpty().withMessage('El teléfono es obligatorio')
    .matches(/^[0-9+\-\s()]{8,20}$/).withMessage('Teléfono inválido - debe tener entre 8 y 20 caracteres, solo números, +, -, espacios y paréntesis')
    .trim(),
  
  body('document')
    .optional()
    .isLength({ min: 7, max: 20 }).withMessage('El documento debe tener entre 7 y 20 caracteres')
    .trim(),
  
  body('documentType')
    .optional()
    .isIn(['DNI', 'CUIL', 'CUIT', 'PASSPORT', 'OTHER']).withMessage('Tipo de documento inválido'),
  
  body('birthDate')
    .optional()
    .isISO8601().withMessage('Fecha de nacimiento inválida - use formato YYYY-MM-DD')
    .toDate(),
  
  body('addresses')
    .optional()
    .isArray().withMessage('addresses debe ser un array'),
  
  body('addresses.*.street')
    .optional()
    .notEmpty().withMessage('La calle es obligatoria para cada dirección'),
  
  body('addresses.*.number')
    .optional()
    .notEmpty().withMessage('El número es obligatorio para cada dirección'),
  
  body('addresses.*.locality')
    .optional()
    .notEmpty().withMessage('La localidad es obligatoria para cada dirección'),
  
  body('addresses.*.city')
    .optional()
    .notEmpty().withMessage('La ciudad es obligatoria para cada dirección'),
  
  body('addresses.*.province')
    .optional()
    .notEmpty().withMessage('La provincia es obligatoria para cada dirección'),
  
  body('addresses.*.label')
    .optional()
    .isIn(['home', 'work', 'other']).withMessage('La etiqueta debe ser home, work o other'),
  
  body('addresses.*.isMain')
    .optional()
    .isBoolean().withMessage('isMain debe ser true o false'),
  
  body('preferences')
    .optional()
    .isObject().withMessage('preferences debe ser un objeto'),
  
  body('preferences.sizes')
    .optional()
    .isArray().withMessage('sizes debe ser un array de strings'),
  
  body('preferences.favoriteColors')
    .optional()
    .isArray().withMessage('favoriteColors debe ser un array de strings'),
  
  body('preferences.favoriteBrands')
    .optional()
    .isArray().withMessage('favoriteBrands debe ser un array de strings'),
  
  body('preferences.shoeSize')
    .optional()
    .isString().withMessage('shoeSize debe ser un string'),
  
  body('preferences.pantsSize')
    .optional()
    .isString().withMessage('pantsSize debe ser un string'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Las notas no pueden exceder 500 caracteres'),
  
  body('subscribesToNewsletter')
    .optional()
    .isBoolean().withMessage('subscribesToNewsletter debe ser true o false'),
  
  body('howDidYouFindUs')
    .optional()
    .isIn(['social_media', 'referral', 'search_engine', 'advertisement', 'other'])
    .withMessage('howDidYouFindUs debe ser uno de: social_media, referral, search_engine, advertisement, other')
];

/**
 * Validador para actualizar un cliente existente
 * Permite campos opcionales y valida el ID del cliente
 */
const validateUpdateClient = [
  param('id')
    .isMongoId().withMessage('ID de cliente inválido'),
  
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
    .matches(/^[0-9+\-\s()]{8,20}$/).withMessage('Teléfono inválido - debe tener entre 8 y 20 caracteres, solo números, +, -, espacios y paréntesis')
    .trim(),
  
  body('document')
    .optional()
    .isLength({ min: 7, max: 20 }).withMessage('El documento debe tener entre 7 y 20 caracteres')
    .trim(),
  
  body('documentType')
    .optional()
    .isIn(['DNI', 'CUIL', 'CUIT', 'PASSPORT', 'OTHER']).withMessage('Tipo de documento inválido'),
  
  body('birthDate')
    .optional()
    .isISO8601().withMessage('Fecha de nacimiento inválida')
    .toDate(),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive debe ser true o false'),
  
  body('isVip')
    .optional()
    .isBoolean().withMessage('isVip debe ser true o false'),
  
  body('clientCategory')
    .optional()
    .isIn(['bronze', 'silver', 'gold', 'platinum']).withMessage('Categoría de cliente inválida'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Las notas no pueden exceder 500 caracteres'),
  
  body('subscribesToNewsletter')
    .optional()
    .isBoolean().withMessage('subscribesToNewsletter debe ser true o false'),
  
  body('howDidYouFindUs')
    .optional()
    .isIn(['social_media', 'referral', 'search_engine', 'advertisement', 'other'])
    .withMessage('howDidYouFindUs inválido')
];

/**
 * Validador para habilitar cuenta corriente
 */
const validateEnableCredit = [
  param('id')
    .isMongoId().withMessage('ID de cliente inválido'),
  
  body('creditLimit')
    .isFloat({ min: 0.01 }).withMessage('El límite de crédito debe ser mayor a 0')
    .toFloat()
];

/**
 * Validador para registrar pago en cuenta corriente
 */
const validateCreditPayment = [
  param('id')
    .isMongoId().withMessage('ID de cliente inválido'),
  
  body('amount')
    .isFloat({ min: 0.01 }).withMessage('El monto debe ser mayor a 0')
    .toFloat(),
  
  body('description')
    .optional()
    .isLength({ max: 200 }).withMessage('La descripción no puede exceder 200 caracteres')
    .trim(),
  
  body('referenceId')
    .optional()
    .isMongoId().withMessage('referenceId debe ser un ID válido de MongoDB')
];

/**
 * Validador para agregar dirección
 */
const validateAddAddress = [
  param('id')
    .isMongoId().withMessage('ID de cliente inválido'),
  
  body('street')
    .notEmpty().withMessage('La calle es obligatoria')
    .trim(),
  
  body('number')
    .notEmpty().withMessage('El número es obligatorio')
    .trim(),
  
  body('floor')
    .optional()
    .trim(),
  
  body('apartment')
    .optional()
    .trim(),
  
  body('locality')
    .notEmpty().withMessage('La localidad es obligatoria')
    .trim(),
  
  body('city')
    .notEmpty().withMessage('La ciudad es obligatoria')
    .trim(),
  
  body('province')
    .notEmpty().withMessage('La provincia es obligatoria')
    .trim(),
  
  body('zipCode')
    .optional()
    .trim(),
  
  body('label')
    .optional()
    .isIn(['home', 'work', 'other']).withMessage('La etiqueta debe ser home, work o other'),
  
  body('isMain')
    .optional()
    .isBoolean().withMessage('isMain debe ser true o false')
];

/**
 * Validador para actualizar dirección
 */
const validateUpdateAddress = [
  param('id')
    .isMongoId().withMessage('ID de cliente inválido'),
  
  param('addressId')
    .isMongoId().withMessage('ID de dirección inválido'),
  
  body('street')
    .optional()
    .trim(),
  
  body('number')
    .optional()
    .trim(),
  
  body('locality')
    .optional()
    .trim(),
  
  body('city')
    .optional()
    .trim(),
  
  body('province')
    .optional()
    .trim(),
  
  body('label')
    .optional()
    .isIn(['home', 'work', 'other']).withMessage('La etiqueta debe ser home, work o other'),
  
  body('isMain')
    .optional()
    .isBoolean().withMessage('isMain debe ser true o false')
];

/**
 * Validador para actualizar preferencias
 */
const validateUpdatePreferences = [
  param('id')
    .isMongoId().withMessage('ID de cliente inválido'),
  
  body('sizes')
    .optional()
    .isArray().withMessage('sizes debe ser un array'),
  
  body('sizes.*')
    .optional()
    .isString().withMessage('Cada talle debe ser un string'),
  
  body('favoriteColors')
    .optional()
    .isArray().withMessage('favoriteColors debe ser un array'),
  
  body('favoriteColors.*')
    .optional()
    .isString().withMessage('Cada color debe ser un string'),
  
  body('preferredCategories')
    .optional()
    .isArray().withMessage('preferredCategories debe ser un array de IDs'),
  
  body('preferredCategories.*')
    .optional()
    .isMongoId().withMessage('Cada categoría debe ser un ID válido'),
  
  body('favoriteBrands')
    .optional()
    .isArray().withMessage('favoriteBrands debe ser un array'),
  
  body('favoriteBrands.*')
    .optional()
    .isString().withMessage('Cada marca debe ser un string'),
  
  body('shoeSize')
    .optional()
    .isString().withMessage('shoeSize debe ser un string'),
  
  body('pantsSize')
    .optional()
    .isString().withMessage('pantsSize debe ser un string'),
  
  body('observations')
    .optional()
    .isLength({ max: 500 }).withMessage('Las observaciones no pueden exceder 500 caracteres')
];

/**
 * Validador para obtener historial de compras con filtros
 */
const validateGetPurchaseHistory = [
  param('id')
    .isMongoId().withMessage('ID de cliente inválido'),
  
  query('startDate')
    .optional()
    .isISO8601().withMessage('startDate debe ser una fecha válida'),
  
  query('endDate')
    .optional()
    .isISO8601().withMessage('endDate debe ser una fecha válida'),
  
  query('status')
    .optional()
    .isIn(['completed', 'cancelled', 'returned']).withMessage('status debe ser completed, cancelled o returned'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page debe ser un número entero positivo'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit debe ser un número entre 1 y 100')
];

/**
 * Validador para obtener clientes con riesgo de crédito
 */
const validateGetCreditRisk = [
  query('percentage')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('percentage debe ser un número entre 0 y 100')
    .toInt()
];

module.exports = {
  validateCreateClient,
  validateUpdateClient,
  validateEnableCredit,
  validateCreditPayment,
  validateAddAddress,
  validateUpdateAddress,
  validateUpdatePreferences,
  validateGetPurchaseHistory,
  validateGetCreditRisk
};