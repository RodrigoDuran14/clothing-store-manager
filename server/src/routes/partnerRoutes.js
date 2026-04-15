const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');
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

// Obtener mi caja (socio autenticado)
router.get('/my-cash-register', partnerController.getMyCashRegister);

// ============================================
// ESTADÍSTICAS Y REPORTES (solo admin)
// ============================================
router.get('/balances', isAdmin, partnerController.getPartnerBalances);

// ============================================
// RUTAS PRINCIPALES (solo admin)
// ============================================

// Obtener todos los socios (GET) - solo admin
// Crear nuevo socio (POST) - solo admin
router.route('/')
  .get(isAdmin, partnerController.getPartners)
  .post(isAdmin, partnerController.createPartner);

// Obtener, actualizar o eliminar un socio específico - solo admin
router.route('/:id')
  .get(isAdmin, partnerController.getPartnerById)
  .put(isAdmin, partnerController.updatePartner)
  .delete(isAdmin, partnerController.deletePartner);

// Resumen de ingresos por socio - solo admin
router.get('/:id/income-summary', isAdmin, partnerController.getPartnerIncomeSummary);

module.exports = router;