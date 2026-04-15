const { body, param, query } = require('express-validator');

const validateCreatePromotion = [
  body('name')
    .notEmpty().withMessage('Promotion name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('code')
    .optional()
    .matches(/^[A-Z0-9]{3,20}$/i).withMessage('Code must be 3-20 alphanumeric characters'),
  body('type')
    .isIn(['automatic', 'coupon', 'seasonal', 'flash_sale', 'bundle'])
    .withMessage('Invalid promotion type'),
  body('benefits')
    .isArray({ min: 1 }).withMessage('At least one benefit is required'),
  body('benefits.*.type')
    .isIn(['percentage_discount', 'fixed_discount', 'buy_x_get_y', 'free_shipping', 'gift_product'])
    .withMessage('Invalid benefit type'),
  body('benefits.*.value')
    .notEmpty().withMessage('Benefit value is required'),
  body('startDate')
    .isISO8601().withMessage('Invalid start date'),
  body('endDate')
    .isISO8601().withMessage('Invalid end date')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('priority')
    .optional()
    .isInt({ min: 0 }).withMessage('Priority must be a positive integer'),
  body('stackable')
    .optional()
    .isBoolean().withMessage('stackable must be true or false')
];

const validateUpdatePromotion = [
  param('id').isMongoId().withMessage('Invalid promotion ID'),
  body('name')
    .optional()
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('code')
    .optional()
    .matches(/^[A-Z0-9]{3,20}$/i).withMessage('Code must be 3-20 alphanumeric characters'),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date'),
  body('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date')
];

const validateValidateCoupon = [
  body('code')
    .notEmpty().withMessage('Coupon code is required'),
  body('clientId')
    .optional()
    .isMongoId().withMessage('Invalid client ID'),
  body('purchaseAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Purchase amount must be positive')
];

const validateGetProductPromotions = [
  param('productId').isMongoId().withMessage('Invalid product ID'),
  query('size')
    .optional()
    .isString().withMessage('Size must be a string'),
  query('color')
    .optional()
    .isString().withMessage('Color must be a string')
];

module.exports = {
  validateCreatePromotion,
  validateUpdatePromotion,
  validateValidateCoupon,
  validateGetProductPromotions
};