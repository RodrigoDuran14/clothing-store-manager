const { body, param, query } = require('express-validator');

const validateCreateBankAccount = [
  body('bankName')
    .notEmpty().withMessage('Bank name is required')
    .isLength({ max: 100 }).withMessage('Bank name cannot exceed 100 characters'),
  body('accountType')
    .isIn(['checking', 'savings', 'credit_card', 'mercadopago', 'other'])
    .withMessage('Invalid account type'),
  body('accountNumber')
    .notEmpty().withMessage('Account number is required')
    .isLength({ max: 50 }).withMessage('Account number too long'),
  body('cbu')
    .optional()
    .matches(/^\d{22}$/).withMessage('CBU must be 22 digits'),
  body('alias')
    .optional()
    .isLength({ max: 50 }).withMessage('Alias too long'),
  body('currency')
    .optional()
    .isIn(['ARS', 'USD', 'EUR', 'BRL']).withMessage('Invalid currency'),
  body('initialBalance')
    .optional()
    .isFloat({ min: 0 }).withMessage('Initial balance must be positive'),
  body('isDefault')
    .optional()
    .isBoolean().withMessage('isDefault must be true or false'),
  body('taxId')
    .optional()
    .matches(/^\d{2}-\d{8}-\d{1}$/).withMessage('Invalid Tax ID format')
];

const validateUpdateBankAccount = [
  param('id').isMongoId().withMessage('Invalid bank account ID'),
  body('bankName')
    .optional()
    .isLength({ max: 100 }).withMessage('Bank name cannot exceed 100 characters'),
  body('accountNumber')
    .optional()
    .isLength({ max: 50 }).withMessage('Account number too long'),
  body('cbu')
    .optional()
    .matches(/^\d{22}$/).withMessage('CBU must be 22 digits'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be true or false')
];

const validateTransfer = [
  body('fromAccountId')
    .isMongoId().withMessage('Invalid from account ID'),
  body('toAccountId')
    .isMongoId().withMessage('Invalid to account ID'),
  body('amount')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description')
    .optional()
    .isLength({ max: 200 }).withMessage('Description too long')
];

const validateReconcile = [
  param('id').isMongoId().withMessage('Invalid bank account ID'),
  body('movementIds')
    .isArray({ min: 1 }).withMessage('movementIds array is required'),
  body('movementIds.*')
    .isMongoId().withMessage('Invalid movement ID')
];

const validateGetReport = [
  param('id').isMongoId().withMessage('Invalid bank account ID'),
  query('startDate')
    .isISO8601().withMessage('Invalid start date'),
  query('endDate')
    .isISO8601().withMessage('Invalid end date')
];

module.exports = {
  validateCreateBankAccount,
  validateUpdateBankAccount,
  validateTransfer,
  validateReconcile,
  validateGetReport
};