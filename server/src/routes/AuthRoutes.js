const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/AuthController');
const { protect } = require('../middleware/Auth');

// Validaciones para registro
const registerValidation = [
  body('name')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .trim(),
  body('email')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase(),
  body('password')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('phone')
    .optional()
    .isLength({ max: 20 }).withMessage('El teléfono no puede exceder 20 caracteres')
    .trim(),
  body('isAdmin')
    .optional()
    .isBoolean().withMessage('isAdmin debe ser true o false')
    .toBoolean(),
  body('image')
    .optional()
    .isURL().withMessage('La imagen debe ser una URL válida')
    .trim()
];

// Validaciones para login
const loginValidation = [
  body('email')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
];

// Rutas públicas
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// Rutas protegidas
router.get('/me', protect, authController.getMe);
router.get('/logout', protect, authController.logout);

module.exports = router;