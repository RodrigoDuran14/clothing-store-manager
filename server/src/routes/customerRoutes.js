const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { protectCustomer } = require('../middleware/customerAuth');
const { validateRegister, validateLogin, validateChangePassword } = require('../validators/customerValidator');

// Rutas públicas
router.post('/register', validateRegister, customerController.register);
router.post('/login', validateLogin, customerController.login);
router.post('/forgot-password', customerController.requestPasswordReset);
router.post('/reset-password', customerController.resetPassword);

// Rutas protegidas (requieren token de cliente)
router.use(protectCustomer);
router.get('/profile', customerController.getProfile);
router.put('/profile', customerController.updateProfile);
router.put('/change-password', validateChangePassword, customerController.changePassword);
router.get('/orders', customerController.getOrders);

// Direcciones
router.post('/addresses', customerController.addAddress);
router.put('/addresses/:addressId', customerController.updateAddress);
router.delete('/addresses/:addressId', customerController.deleteAddress);

module.exports = router;