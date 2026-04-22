const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');
const {
  validateCreateCategory,
  validateUpdateCategory,
  validateReorderCategories,
  validateGetCategories,
  validateGetCategoryById,
  validateDeleteCategory,
  validateGetSubcategories,
  validateGetBreadcrumb,
  validateToggleStatus
} = require('../validators/categoryValidator');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// ESTADÍSTICAS Y REPORTES
// ============================================
router.get('/stats', categoryController.getCategoryStats);

// ============================================
// REORDENAR CATEGORÍAS (acción especial)
// ============================================
router.put('/reorder', isAdmin, validateReorderCategories, categoryController.reorderCategories);

// ============================================
// RUTAS PRINCIPALES DE CATEGORÍAS
// ============================================

// Obtener todas las categorías (GET) - acceso general autenticado
// Crear nueva categoría (POST) - solo admin
router.route('/')
  .get(validateGetCategories, categoryController.getCategories)
  .post(isAdmin, validateCreateCategory, categoryController.createCategory);

// Obtener, actualizar o eliminar una categoría específica
// GET - acceso general autenticado
// PUT - solo admin
// DELETE - solo admin (soft delete)
router.route('/:id')
  .get(validateGetCategoryById, categoryController.getCategoryById)
  .put(isAdmin, validateUpdateCategory, categoryController.updateCategory)
  .delete(isAdmin, validateDeleteCategory, categoryController.deleteCategory);

// ============================================
// OPERACIONES ESPECIALES POR ID
// ============================================

// Obtener subcategorías de una categoría
router.get('/:id/subcategories', validateGetSubcategories, categoryController.getSubcategories);

// Obtener breadcrumb (ruta de navegación) de una categoría
router.get('/:id/breadcrumb', validateGetBreadcrumb, categoryController.getCategoryBreadcrumb);

// Activar/Desactivar categoría (toggle)
router.patch('/:id/toggle-status', isAdmin, validateToggleStatus, categoryController.toggleCategoryStatus);

// Eliminación permanente (peligroso, solo admin)
router.delete('/:id/permanent', isAdmin, validateDeleteCategory, categoryController.permanentDeleteCategory);

module.exports = router;