const { body, param } = require('express-validator');

exports.validateAddToCart = [
  body('productId').isMongoId().withMessage('ID de producto inválido'),
  body('size').notEmpty().withMessage('El talle es obligatorio'),
  body('color').notEmpty().withMessage('El color es obligatorio'),
  body('quantity').isInt({ min: 1 }).withMessage('Cantidad debe ser mayor a 0')
];

exports.validateUpdateQuantity = [
  param('itemId').isMongoId().withMessage('ID de item inválido'),
  body('quantity').isInt({ min: 0 }).withMessage('Cantidad debe ser un entero no negativo')
];