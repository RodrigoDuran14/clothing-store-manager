const { body, param, query } = require('express-validator');

const validateCreateFromSale = [
  param('saleId').isMongoId().withMessage('Invalid sale ID'),
  body('invoiceType')
    .optional()
    .isIn(['A', 'B', 'C', 'TICKET']).withMessage('Invalid invoice type'),
  body('pointOfSale')
    .optional()
    .matches(/^\d{4}$/).withMessage('Point of sale must be 4 digits')
];

const validateIssueInvoice = [
  param('id').isMongoId().withMessage('Invalid invoice ID')
];

const validateCancelInvoice = [
  param('id').isMongoId().withMessage('Invalid invoice ID'),
  body('reason')
    .optional()
    .isLength({ max: 200 }).withMessage('Reason too long')
];

const validateGetStats = [
  query('startDate')
    .isISO8601().withMessage('Invalid start date'),
  query('endDate')
    .isISO8601().withMessage('Invalid end date')
];

module.exports = {
  validateCreateFromSale,
  validateIssueInvoice,
  validateCancelInvoice,
  validateGetStats
};