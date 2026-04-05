const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/Auth');
const { isAdmin, isSameUserOrAdmin } = require('../middleware/role');
const {
  validateCreateUser,
  validateUpdateUser,
  validateGetUser,
  validateDeleteUser,
  validateListUsers
} = require('../validators/userValidator');

// Todas las rutas requieren autenticación
router.use(protect);

// Estadísticas (admin)
router.get('/stats', isAdmin, userController.getUserStats);

// Rutas principales de usuarios (admin)
router.route('/')
  .get(isAdmin, validateListUsers, userController.getUsers)
  .post(isAdmin, validateCreateUser, userController.createUser);

// Rutas para usuario específico
router.route('/:id')
  .get(isAdmin, validateGetUser, userController.getUserById)
  .put(isAdmin, validateUpdateUser, userController.updateUser)
  .delete(isAdmin, validateDeleteUser, userController.deleteUser);

// Rutas adicionales
router.put('/:id/reactivate', isAdmin, validateGetUser, userController.reactivateUser);
router.delete('/:id/permanent', isAdmin, validateGetUser, userController.permanentDeleteUser);

module.exports = router;