const { body, param, query } = require('express-validator');

const validateCreateProduct = [
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 200 }).withMessage('El nombre no puede exceder 200 caracteres'),
  body('categoria_id')
    .isMongoId().withMessage('ID de categoría inválido'),
  body('proveedor_id')
    .isMongoId().withMessage('ID de proveedor inválido'),
  body('precio')
    .isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
  body('costo')
    .isFloat({ min: 0 }).withMessage('El costo debe ser un número positivo'),
  body('variantes')
    .optional()
    .isArray().withMessage('variantes debe ser un array'),
  body('variantes.*.talle')
    .optional()
    .notEmpty().withMessage('El talle es obligatorio para cada variante'),
  body('variantes.*.color')
    .optional()
    .notEmpty().withMessage('El color es obligatorio para cada variante'),
  body('variantes.*.stock')
    .optional()
    .isInt({ min: 0 }).withMessage('El stock debe ser un número entero no negativo')
];

const validateUpdateProduct = [
  param('id').isMongoId().withMessage('ID de producto inválido'),
  body('precio')
    .optional()
    .isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
  body('costo')
    .optional()
    .isFloat({ min: 0 }).withMessage('El costo debe ser un número positivo')
];

const validateUpdateStock = [
  param('id').isMongoId().withMessage('ID de producto inválido'),
  body('talle').notEmpty().withMessage('El talle es obligatorio'),
  body('color').notEmpty().withMessage('El color es obligatorio'),
  body('cantidad')
    .isInt({ min: 0 }).withMessage('La cantidad debe ser un número entero positivo'),
  body('tipo')
    .optional()
    .isIn(['venta', 'compra', 'devolucion', 'ajuste'])
    .withMessage('Tipo inválido')
];

module.exports = {
  validateCreateProduct,
  validateUpdateProduct,
  validateUpdateStock
};