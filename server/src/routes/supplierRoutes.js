const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');
const {
  validateCreateSupplier,
  validateUpdateSupplier,
  validateAddProduct,
  validateRecordPurchase,
  validateUpdateDebt,
  validateGetSuppliers,
  validateGetTopSuppliers,
  validateRemoveProduct
} = require('../validators/supplierValidator');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// ESTADÍSTICAS Y REPORTES
// ============================================
router.get('/stats', supplierController.getSupplierStats);
router.get('/top', validateGetTopSuppliers, supplierController.getTopSuppliers);
router.get('/financial-summary', isAdmin, supplierController.getFinancialSummary);

// ============================================
// BÚSQUEDAS ESPECIALES
// ============================================
router.get('/by-product/:productId', supplierController.getSuppliersByProduct);

// ============================================
// RUTAS PRINCIPALES DE PROVEEDORES
// ============================================

// Obtener todos los proveedores (GET) - acceso general autenticado
// Crear nuevo proveedor (POST) - solo admin
router.route('/')
  .get(validateGetSuppliers, supplierController.getSuppliers)
  .post(isAdmin, validateCreateSupplier, supplierController.createSupplier);

// Obtener, actualizar o eliminar un proveedor específico
// GET - acceso general autenticado
// PUT - solo admin
// DELETE - solo admin (soft delete)
router.route('/:id')
  .get(supplierController.getSupplierById)
  .put(isAdmin, validateUpdateSupplier, supplierController.updateSupplier)
  .delete(isAdmin, supplierController.deleteSupplier);

// ============================================
// ELIMINACIÓN PERMANENTE
// ============================================
router.delete('/:id/permanent', isAdmin, supplierController.permanentDeleteSupplier);

// ============================================
// GESTIÓN DE PRODUCTOS ASOCIADOS
// ============================================

// Asociar producto a proveedor - solo admin
router.post('/:id/products', isAdmin, validateAddProduct, supplierController.addProductToSupplier);

// Desasociar producto de proveedor - solo admin
router.delete('/:id/products/:productId', isAdmin, validateRemoveProduct, supplierController.removeProductFromSupplier);

// ============================================
// GESTIÓN DE COMPRAS Y DEUDA
// ============================================

// Registrar compra a proveedor - solo admin
router.post('/:id/purchase', isAdmin, validateRecordPurchase, supplierController.recordPurchase);

// Actualizar deuda del proveedor - solo admin
router.put('/:id/debt', isAdmin, validateUpdateDebt, supplierController.updateDebt);

// ============================================
// CONTROL DE ESTADO
// ============================================

// Activar/Desactivar proveedor (toggle) - solo admin
router.patch('/:id/toggle-status', isAdmin, supplierController.toggleSupplierStatus);

module.exports = router;