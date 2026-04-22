const express = require('express');
const router = express.Router();
const bankAccountController = require('../controllers/bankAccountController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');
const {
  validateCreateBankAccount,
  validateUpdateBankAccount,
  validateTransfer,
  validateReconcile,
  validateGetReport
} = require('../validators/bankAccountValidator');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// ESTADÍSTICAS Y DASHBOARD
// ============================================
router.get('/stats', bankAccountController.getBankStats);
router.get('/dashboard', bankAccountController.getFinancialDashboard);
router.get('/default', bankAccountController.getDefaultAccount);

// ============================================
// TRANSFERENCIAS ENTRE CUENTAS
// ============================================
router.post('/transfer', isAdmin, validateTransfer, bankAccountController.transferBetweenAccounts);

// ============================================
// RUTAS PRINCIPALES DE CUENTAS BANCARIAS
// ============================================

// Obtener todas las cuentas (GET) - acceso general autenticado
// Crear nueva cuenta (POST) - solo admin
router.route('/')
  .get(bankAccountController.getBankAccounts)
  .post(isAdmin, validateCreateBankAccount, bankAccountController.createBankAccount);

// Obtener, actualizar o eliminar una cuenta específica
// GET - acceso general autenticado
// PUT - solo admin
// DELETE - solo admin
router.route('/:id')
  .get(bankAccountController.getBankAccountById)
  .put(isAdmin, validateUpdateBankAccount, bankAccountController.updateBankAccount)
  .delete(isAdmin, bankAccountController.deleteBankAccount);

// ============================================
// MOVIMIENTOS Y REPORTES
// ============================================

// Obtener movimientos de una cuenta
router.get('/:id/movements', bankAccountController.getMovements);

// Obtener reporte de cuenta por período
router.get('/:id/report', validateGetReport, bankAccountController.getAccountReport);

// Conciliar movimientos
router.post('/:id/reconcile', isAdmin, validateReconcile, bankAccountController.reconcileMovements);

module.exports = router;