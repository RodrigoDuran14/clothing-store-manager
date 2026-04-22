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
// APERTURA Y CIERRE
// ============================================
router.post('/open', cashController.openCashRegister);
router.post('/close', cashController.closeCashRegister);

// ============================================
// OPERACIONES DE CAJA
// ============================================
router.post('/expense', cashController.registerExpense);
router.post('/withdraw', cashController.withdrawCash);
router.post('/deposit', cashController.depositCash);

// ============================================
// REPORTES Y MOVIMIENTOS
// ============================================
router.get('/report', cashController.getCashReport);
router.get('/movements', cashController.getCashMovements);

// ============================================
// CIERRE (PREPARAR Y EJECUTAR)
// ============================================
router.get('/prepare-closure', cashController.prepareClosure);

// ============================================
// ARQUEO Y AUDITORÍA
// ============================================
router.get('/audit', cashController.getCashAudit);
router.get('/daily-report', cashController.getDailyCashReport);

// ============================================
// OPERACIONES DE ADMIN
// ============================================
router.post('/adjust', isAdmin, cashController.adjustCash);
router.get('/discrepancies', isAdmin, cashController.getDiscrepancies);
router.put('/discrepancies/:id/resolve', isAdmin, cashController.resolveDiscrepancy);

module.exports = router;