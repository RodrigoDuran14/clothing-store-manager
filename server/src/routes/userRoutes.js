const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');
const {
  validateUpdateMyProfile,
  validateChangePassword,
  validateIdUser,
  validateListUsers,
} = require('../validators/userValidator');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// PERFIL DEL USUARIO AUTENTICADO
// ============================================

// Actualizar mi perfil - acceso autenticado
router.put('/profile', validateUpdateMyProfile, userController.updateMyProfile);

// Cambiar mi contraseña - acceso autenticado
router.put('/change-password', validateChangePassword, userController.changePassword);

// ============================================
// ESTADÍSTICAS (solo admin)
// ============================================
router.get('/stats', isAdmin, userController.getUserStats);

// ============================================
// RUTAS PRINCIPALES DE USUARIOS (solo admin)
// ============================================

// Obtener todos los usuarios (GET) - solo admin
// Crear nuevo usuario (POST) - solo admin
router.route('/')
  .get(isAdmin, validateListUsers, userController.getUsers)

// Obtener, actualizar o eliminar un usuario específico (solo admin)
router.route('/:id')
  .get(isAdmin, validateIdUser, userController.getUserById)
  .patch(isAdmin, validateIdUser, userController.deleteUser);
  
  // ============================================
  // OPERACIONES ESPECIALES (solo admin)
  // ============================================
  
//toggle para cambiar o quitar admin
router.patch('/:id/toggle', isAdmin, validateIdUser, userController.toggleAdmin)

// Reactivar usuario desactivado
router.put('/:id/reactivate', isAdmin, validateIdUser, userController.reactivateUser);

// Eliminar usuario permanentemente (casos extremos)
router.delete('/:id/permanent', isAdmin, validateIdUser, userController.permanentDeleteUser);

module.exports = router;