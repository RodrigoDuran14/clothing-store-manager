const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');
const {
  validateCreateReturn,
  validateApproveReturn,
  validateRejectReturn,
  validateProcessReturn,
  validateCancelReturn,
  validateGetReturnStats
} = require('../validators/returnValidator');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// ESTADÍSTICAS Y REPORTES
// ============================================
router.get('/stats', validateGetReturnStats, returnController.getReturnStats);

// ============================================
// BÚSQUEDAS ESPECIALES
// ============================================
router.get('/number/:returnNumber', returnController.getReturnByNumber);
router.get('/client/:clientId', returnController.getReturnsByClient);

// ============================================
// RUTAS PRINCIPALES DE DEVOLUCIONES
// ============================================

// Obtener todas las devoluciones (GET) - acceso general autenticado
// Crear nueva devolución (POST) - solo admin
router.route('/')
  .get(returnController.getReturns)
  .post(isAdmin, validateCreateReturn, returnController.createReturn);

// Obtener devolución por ID - acceso general autenticado
router.get('/:id', returnController.getReturnById);

// ============================================
// FLUJO DE APROBACIÓN DE DEVOLUCIONES
// ============================================

// Aprobar devolución - solo admin
router.put('/:id/approve', isAdmin, validateApproveReturn, returnController.approveReturn);

// Rechazar devolución - solo admin
router.put('/:id/reject', isAdmin, validateRejectReturn, returnController.rejectReturn);

// Procesar devolución (restaurar stock + reembolso) - solo admin
router.post('/:id/process', isAdmin, validateProcessReturn, returnController.processReturn);

// Cancelar devolución - solo admin
router.put('/:id/cancel', isAdmin, validateCancelReturn, returnController.cancelReturn);

module.exports = router;