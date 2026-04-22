const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');
const {
  validateCreatePromotion,
  validateUpdatePromotion,
  validateValidateCoupon,
  validateGetProductPromotions
} = require('../validators/promotionValidator');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// ESTADÍSTICAS Y REPORTES
// ============================================
router.get('/stats', promotionController.getPromotionStats);
router.get('/active', promotionController.getActivePromotions);
router.get('/featured', promotionController.getFeaturedPromotions);

// ============================================
// VALIDACIÓN DE CUPONES
// ============================================
router.post('/validate', validateValidateCoupon, promotionController.validateCoupon);

// ============================================
// BÚSQUEDAS ESPECIALES
// ============================================
router.get('/code/:code', promotionController.getPromotionByCode);
router.get('/product/:productId', validateGetProductPromotions, promotionController.getProductPromotions);

// ============================================
// RUTAS PRINCIPALES DE PROMOCIONES
// ============================================

// Obtener todas las promociones (GET) - acceso general autenticado
// Crear nueva promoción (POST) - solo admin
router.route('/')
  .get(promotionController.getPromotions)
  .post(isAdmin, validateCreatePromotion, promotionController.createPromotion);

// Obtener, actualizar o eliminar una promoción específica
// GET - acceso general autenticado
// PUT - solo admin
// DELETE - solo admin
router.route('/:id')
  .get(promotionController.getPromotionById)
  .put(isAdmin, validateUpdatePromotion, promotionController.updatePromotion)
  .delete(isAdmin, promotionController.deletePromotion);

// ============================================
// CONTROL DE ESTADO
// ============================================

// Activar/Desactivar promoción (toggle) - solo admin
router.patch('/:id/toggle-status', isAdmin, promotionController.togglePromotionStatus);

module.exports = router;