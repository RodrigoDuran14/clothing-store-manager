const { body } = require('express-validator');

exports.validateRegister = [
  body('firstName').notEmpty().withMessage('Nombre obligatorio'),
  body('lastName').notEmpty().withMessage('Apellido obligatorio'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('phone').optional().isLength({ min: 8 }).withMessage('Teléfono inválido')
];

exports.validateLogin = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña obligatoria')
];

exports.validateChangePassword = [
  body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
  body('newPassword').isLength({ min: 6 }).withMessage('Nueva contraseña debe tener al menos 6 caracteres')
];