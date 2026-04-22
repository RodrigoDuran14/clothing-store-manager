const express = require('express');
const router = express.Router();
const partnerSplitController = require('../controllers/partnerSplitController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');
const { checkPartnerAccess } = require('../middleware/partnerAccess');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// RUTAS PARA EL SOCIO AUTENTICADO
// ============================================

// Dashboard del socio autenticado
router.get('/my-dashboard', partnerSplitController.getMyDashboard);

// Mis splits (solo los que me corresponden a mí)
router.get('/my-splits', partnerSplitController.getMySplits);

// ============================================
// ESTADÍSTICAS Y REPORTES (solo admin)
// ============================================
router.get('/summary', isAdmin, partnerSplitController.getSplitSummary);

// ============================================
// BÚSQUEDAS POR VENTA
// ============================================
router.get('/sale/:saleId', isAdmin, partnerSplitController.getSplitsBySale);

// ============================================
// RUTAS PRINCIPALES (solo admin)
// ============================================

// Obtener todas las divisiones (GET) - solo admin
// Crear nueva división manual (POST) - solo admin
router.route('/')
  .get(isAdmin, partnerSplitController.getPartnerSplits)
  .post(isAdmin, partnerSplitController.createPartnerSplit);

// Obtener división por ID - solo admin
router.get('/:id', isAdmin, partnerSplitController.getPartnerSplitById);

// Procesar división (registrar movimientos) - solo admin
router.post('/:id/process', isAdmin, partnerSplitController.processPartnerSplit);

module.exports = router;