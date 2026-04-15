const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');
const {
  validateCreateUser,
  validateUpdateUser,
  validateUpdateMyProfile,
  validateChangePassword,
  validateGetUser,
  validateDeleteUser,
  validateListUsers,
  validateReactivateUser,
  validateUpdateLastLogin
} = require('../validators/userValidator');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// PERFIL DEL USUARIO AUTENTICADO
// ============================================

// Obtener mi perfil - acceso autenticado
router.get('/profile', userController.getMyProfile);

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
  .post(isAdmin, validateCreateUser, userController.createUser);

// Obtener, actualizar o eliminar un usuario específico (solo admin)
router.route('/:id')
  .get(isAdmin, validateGetUser, userController.getUserById)
  .put(isAdmin, validateUpdateUser, userController.updateUser)
  .delete(isAdmin, validateDeleteUser, userController.deleteUser);

// ============================================
// OPERACIONES ESPECIALES (solo admin)
// ============================================

// Reactivar usuario desactivado
router.put('/:id/reactivate', isAdmin, validateReactivateUser, userController.reactivateUser);

// Eliminar usuario permanentemente (casos extremos)
router.delete('/:id/permanent', isAdmin, validateGetUser, userController.permanentDeleteUser);

// Actualizar último login (útil para seguimiento)
router.patch('/:id/last-login', isAdmin, validateUpdateLastLogin, userController.updateLastLogin);

module.exports = router;