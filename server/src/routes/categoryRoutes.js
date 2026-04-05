const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');
const {
  validateCreateCategory,
  validateUpdateCategory,
  validateReorderCategories
} = require('../validators/categoryValidator');

// Todas las rutas requieren autenticación
router.use(protect);

// Estadísticas
router.get('/stats', categoryController.getCategoryStats);

// Reordenar categorías
router.put('/reorder', isAdmin, validateReorderCategories, categoryController.reorderCategories);

// Rutas principales
router.route('/')
  .get(categoryController.getCategories)
  .post(isAdmin, validateCreateCategory, categoryController.createCategory);

router.route('/:id')
  .get(categoryController.getCategoryById)
  .put(isAdmin, validateUpdateCategory, categoryController.updateCategory)
  .delete(isAdmin, categoryController.deleteCategory);

// Eliminación permanente
router.delete('/:id/permanent', isAdmin, categoryController.permanentDeleteCategory);

module.exports = router;