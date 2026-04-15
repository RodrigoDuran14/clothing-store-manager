const express = require('express');
const router = express.Router();
const cashController = require('../controllers/cashController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// OPERACIONES DE CAJA PARA SOCIO AUTENTICADO
// ============================================

// Abrir caja
router.post('/open', cashController.openCashRegister);

// Cerrar caja
router.post('/close', cashController.closeCashRegister);

// Registrar gasto
router.post('/expense', cashController.registerExpense);

// Retirar efectivo
router.post('/withdraw', cashController.withdrawCash);

// Depositar efectivo
router.post('/deposit', cashController.depositCash);

// Reporte de caja
router.get('/report', cashController.getCashReport);

// Movimientos de caja
router.get('/movements', cashController.getCashMovements);

// ============================================
// OPERACIONES DE ADMIN
// ============================================

// Ajustar caja (solo admin)
router.post('/adjust', isAdmin, cashController.adjustCash);

module.exports = router;