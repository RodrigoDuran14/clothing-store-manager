const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');
const {
  validateCreateSale,
  validateAddPayment,
  validateCancelSale,
  validateGetSalesSummary,
  validateGetTopProducts
} = require('../validators/saleValidator');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// ESTADÍSTICAS Y REPORTES
// ============================================
router.get('/stats', saleController.getSaleStats);
router.get('/summary', validateGetSalesSummary, saleController.getSalesSummary);
router.get('/top-products', validateGetTopProducts, saleController.getTopProducts);

// ============================================
// BÚSQUEDAS ESPECIALES
// ============================================
router.get('/number/:saleNumber', saleController.getSaleByNumber);

// ============================================
// RUTAS PRINCIPALES DE VENTAS
// ============================================

// Obtener todas las ventas (GET) - acceso general autenticado
// Crear nueva venta (POST) - solo admin
router.route('/')
  .get(saleController.getSales)
  .post(isAdmin, validateCreateSale, saleController.createSale);

// Obtener venta por ID - acceso general autenticado
router.get('/:id', saleController.getSaleById);

// ============================================
// GESTIÓN DE PAGOS
// ============================================

// Agregar pago a venta existente - solo admin
router.post('/:id/payments', isAdmin, validateAddPayment, saleController.addPayment);

// ============================================
// CANCELACIÓN DE VENTAS
// ============================================

// Cancelar venta - solo admin
router.put('/:id/cancel', isAdmin, validateCancelSale, saleController.cancelSale);

module.exports = router;