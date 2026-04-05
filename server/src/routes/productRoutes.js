const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateUpdateStock
} = require('../validators/productValidator');

// Todas las rutas requieren autenticación
router.use(protect);

// Estadísticas y reportes
router.get('/stats', productController.getProductStats);
router.get('/low-stock', productController.getLowStockProducts);

// Búsqueda por código de barras
router.get('/barcode/:codigo', productController.getProductByBarcode);

// Rutas principales
router.route('/')
  .get(productController.getProducts)
  .post(isAdmin, validateCreateProduct, productController.createProduct);

router.route('/:id')
  .get(productController.getProductById)
  .put(isAdmin, validateUpdateProduct, productController.updateProduct)
  .delete(isAdmin, productController.deleteProduct);

// Actualizar stock
router.put('/:id/stock', isAdmin, validateUpdateStock, productController.updateStock);

module.exports = router;