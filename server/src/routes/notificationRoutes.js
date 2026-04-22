const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// NOTIFICACIONES DEL USUARIO
// ============================================
router.get('/', notificationController.getMyNotifications);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

// ============================================
// PLANTILLAS (solo admin)
// ============================================
router.get('/templates', isAdmin, notificationController.getTemplates);
router.post('/templates', isAdmin, notificationController.saveTemplate);

// ============================================
// ENVÍO MANUAL (solo admin)
// ============================================
router.post('/send', isAdmin, notificationController.sendManualNotification);

module.exports = router;