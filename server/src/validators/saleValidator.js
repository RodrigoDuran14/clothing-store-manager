const { body, param, query } = require('express-validator');

const validateCreateSale = [
  body('clientId')
    .isMongoId().withMessage('Invalid client ID'),
  body('sellerId')
    .isMongoId().withMessage('Invalid seller ID'),
  body('items')
    .isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId')
    .isMongoId().withMessage('Invalid product ID'),
  body('items.*.size')
    .notEmpty().withMessage('Size is required'),
  body('items.*.color')
    .notEmpty().withMessage('Color is required'),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('discount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Discount must be a positive number'),
  body('tax')
    .optional()
    .isFloat({ min: 0 }).withMessage('Tax must be a positive number'),
  body('payments')
    .optional()
    .isArray().withMessage('Payments must be an array'),
  body('payments.*.method')
    .isIn(['cash', 'credit_card', 'debit_card', 'transfer', 'credit_account'])
    .withMessage('Invalid payment method'),
  body('payments.*.amount')
    .isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
  body('origin')
    .optional()
    .isIn(['physical_store', 'ecommerce', 'phone', 'whatsapp'])
    .withMessage('Invalid origin')
];

const validateAddPayment = [
  param('id').isMongoId().withMessage('Invalid sale ID'),
  body('method')
    .isIn(['cash', 'credit_card', 'debit_card', 'transfer', 'credit_account'])
    .withMessage('Invalid payment method'),
  body('amount')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('bankAccountId')
    .optional()
    .isMongoId().withMessage('Invalid bank account ID'),
  body('reference')
    .optional()
    .isLength({ max: 100 }).withMessage('Reference too long')
];

const validateCancelSale = [
  param('id').isMongoId().withMessage('Invalid sale ID'),
  body('reason')
    .optional()
    .isLength({ max: 200 }).withMessage('Reason too long')
];

const validateGetSalesSummary = [
  query('startDate')
    .isISO8601().withMessage('Invalid start date'),
  query('endDate')
    .isISO8601().withMessage('Invalid end date'),
  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month']).withMessage('groupBy must be day, week, or month')
];

const validateGetTopProducts = [
  query('startDate')
    .isISO8601().withMessage('Invalid start date'),
  query('endDate')
    .isISO8601().withMessage('Invalid end date'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

module.exports = {
  validateCreateSale,
  validateAddPayment,
  validateCancelSale,
  validateGetSalesSummary,
  validateGetTopProducts
};