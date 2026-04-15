const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateUpdateStock,
  validateGetProducts,
  validateCheckStock,
  validateAddImage,
  validateDeleteImage
} = require('../validators/productValidator');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// ESTADÍSTICAS Y REPORTES
// ============================================
router.get('/stats', productController.getProductStats);
router.get('/low-stock', productController.getLowStockProducts);

// ============================================
// BÚSQUEDAS ESPECIALES
// ============================================
router.get('/barcode/:barcode', productController.getProductByBarcode);

// ============================================
// RUTAS PRINCIPALES DE PRODUCTOS
// ============================================

// Obtener todos los productos (GET) - acceso general autenticado
// Crear nuevo producto (POST) - solo admin
router.route('/')
  .get(validateGetProducts, productController.getProducts)
  .post(isAdmin, validateCreateProduct, productController.createProduct);

// Obtener, actualizar o eliminar un producto específico
// GET - acceso general autenticado
// PUT - solo admin
// DELETE - solo admin (soft delete)
router.route('/:id')
  .get(productController.getProductById)
  .put(isAdmin, validateUpdateProduct, productController.updateProduct)
  .delete(isAdmin, productController.deleteProduct);

// ============================================
// GESTIÓN DE STOCK
// ============================================

// Actualizar stock de una variante - solo admin
router.put('/:id/stock', isAdmin, validateUpdateStock, productController.updateStock);

// Verificar stock disponible - acceso general autenticado
router.get('/:id/check-stock', validateCheckStock, productController.checkStock);

// ============================================
// GESTIÓN DE IMÁGENES
// ============================================

// Agregar imagen a producto - solo admin
router.post('/:id/images', isAdmin, validateAddImage, productController.addProductImage);

// Eliminar imagen de producto - solo admin
router.delete('/:id/images/:imageId', isAdmin, validateDeleteImage, productController.deleteProductImage);

// Establecer imagen principal - solo admin
router.put('/:id/images/:imageId/main', isAdmin, productController.setMainImage);

// ============================================
// CONTROL DE ESTADO
// ============================================

// Activar/Desactivar producto (toggle) - solo admin
router.patch('/:id/toggle-status', isAdmin, productController.toggleProductStatus);

module.exports = router;