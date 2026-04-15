const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');
const {
  validateCreateFromSale,
  validateIssueInvoice,
  validateCancelInvoice,
  validateGetStats
} = require('../validators/invoiceValidator');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// ESTADÍSTICAS Y REPORTES
// ============================================
router.get('/stats', validateGetStats, invoiceController.getInvoiceStats);

// ============================================
// BÚSQUEDAS ESPECIALES
// ============================================
router.get('/number/:invoiceNumber', invoiceController.getInvoiceByNumber);

// ============================================
// GENERACIÓN DESDE VENTA
// ============================================
router.post('/from-sale/:saleId', isAdmin, validateCreateFromSale, invoiceController.createInvoiceFromSale);

// ============================================
// RUTAS PRINCIPALES DE FACTURAS
// ============================================

// Obtener todas las facturas (GET) - acceso general autenticado
router.get('/', invoiceController.getInvoices);

// Obtener factura por ID - acceso general autenticado
router.get('/:id', invoiceController.getInvoiceById);

// ============================================
// ACCIONES SOBRE FACTURAS (solo admin)
// ============================================

// Emitir factura (autorizar AFIP + generar PDF)
router.post('/:id/issue', isAdmin, validateIssueInvoice, invoiceController.issueInvoice);

// Cancelar factura
router.put('/:id/cancel', isAdmin, validateCancelInvoice, invoiceController.cancelInvoice);

// Descargar PDF
router.get('/:id/pdf', invoiceController.downloadPDF);

module.exports = router;