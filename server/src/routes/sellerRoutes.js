const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');
const {
  validateCreateSeller,
  validateUpdateSeller,
  validatePayCommission,
  validateGetSellers,
  validateGetTopSellers,
  validateCalculateCommissions,
  validateAddShift,
  validateRemoveShift
} = require('../validators/sellerValidator');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// ESTADÍSTICAS Y REPORTES
// ============================================
router.get('/stats', sellerController.getSellerStats);
router.get('/top', validateGetTopSellers, sellerController.getTopSellers);

// ============================================
// CÁLCULO DE COMISIONES (todos los vendedores)
// ============================================
router.get('/commissions/calculate', isAdmin, validateCalculateCommissions, sellerController.calculateCommissions);

// ============================================
// RESETEO DE MÉTRICAS MENSUALES
// ============================================
router.post('/reset-monthly-metrics', isAdmin, sellerController.resetMonthlyMetrics);

// ============================================
// BÚSQUEDA POR USUARIO
// ============================================
router.get('/user/:userId', sellerController.getSellerByUserId);

// ============================================
// RUTAS PRINCIPALES DE VENDEDORES
// ============================================

// Obtener todos los vendedores (GET) - acceso general autenticado
// Crear nuevo vendedor (POST) - solo admin
router.route('/')
  .get(validateGetSellers, sellerController.getSellers)
  .post(isAdmin, validateCreateSeller, sellerController.createSeller);

// Obtener, actualizar o eliminar un vendedor específico
// GET - acceso general autenticado
// PUT - solo admin
// DELETE - solo admin (soft delete)
router.route('/:id')
  .get(sellerController.getSellerById)
  .put(isAdmin, validateUpdateSeller, sellerController.updateSeller)
  .delete(isAdmin, sellerController.deleteSeller);

// ============================================
// GESTIÓN DE TURNOS DE TRABAJO
// ============================================

// Agregar turno a vendedor - solo admin
router.post('/:id/shifts', isAdmin, validateAddShift, sellerController.addShift);

// Eliminar turno de vendedor - solo admin
router.delete('/:id/shifts/:shiftId', isAdmin, validateRemoveShift, sellerController.removeShift);

// ============================================
// COMISIONES POR VENDEDOR
// ============================================

// Obtener resumen de comisiones de un vendedor - acceso general autenticado
router.get('/:id/commissions/summary', sellerController.getCommissionSummary);

// Procesar pago de comisión - solo admin
router.post('/:id/commissions/pay', isAdmin, validatePayCommission, sellerController.payCommission);

// ============================================
// CONTROL DE ESTADO
// ============================================

// Activar/Desactivar vendedor (toggle) - solo admin
router.patch('/:id/toggle-status', isAdmin, sellerController.toggleSellerStatus);

module.exports = router;