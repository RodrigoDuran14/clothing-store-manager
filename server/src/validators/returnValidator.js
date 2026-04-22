const { body, param, query } = require('express-validator');

const validateCreateReturn = [
  body('saleId')
    .isMongoId().withMessage('Invalid sale ID'),
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
  body('reason')
    .isIn([
      'wrong_size', 'wrong_color', 'defective', 'damaged',
      'not_as_described', 'change_of_mind', 'other'
    ]).withMessage('Invalid return reason'),
  body('reasonDescription')
    .optional()
    .isLength({ max: 500 }).withMessage('Description too long'),
  body('refundMethod')
    .isIn(['cash', 'credit_card', 'transfer', 'credit_account', 'voucher'])
    .withMessage('Invalid refund method'),
  body('images')
    .optional()
    .isArray().withMessage('Images must be an array')
];

const validateApproveReturn = [
  param('id').isMongoId().withMessage('Invalid return ID'),
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notes too long')
];

const validateRejectReturn = [
  param('id').isMongoId().withMessage('Invalid return ID'),
  body('reason')
    .optional()
    .isLength({ max: 200 }).withMessage('Reason too long')
];

const validateProcessReturn = [
  param('id').isMongoId().withMessage('Invalid return ID')
];

const validateCancelReturn = [
  param('id').isMongoId().withMessage('Invalid return ID'),
  body('reason')
    .optional()
    .isLength({ max: 200 }).withMessage('Reason too long')
];

const validateGetReturnStats = [
  query('startDate')
    .isISO8601().withMessage('Invalid start date'),
  query('endDate')
    .isISO8601().withMessage('Invalid end date')
];

module.exports = {
  validateCreateReturn,
  validateApproveReturn,
  validateRejectReturn,
  validateProcessReturn,
  validateCancelReturn,
  validateGetReturnStats
};