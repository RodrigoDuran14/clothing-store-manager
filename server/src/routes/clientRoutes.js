const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');
const {
  validateCreateClient,
  validateUpdateClient,
  validateEnableCredit,
  validateCreditPayment,
  validateAddAddress,
  validateUpdateAddress,
  validateUpdatePreferences,
  validateGetPurchaseHistory,
  validateGetCreditRisk
} = require('../validators/clientValidator');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// ESTADÍSTICAS Y REPORTES (acceso general)
// ============================================
router.get('/stats', clientController.getClientStats);
router.get('/credit-risk', isAdmin, validateGetCreditRisk, clientController.getCreditRiskClients);

// ============================================
// RUTAS PRINCIPALES DE CLIENTES
// ============================================

// Obtener todos los clientes (GET) - acceso general autenticado
// Crear nuevo cliente (POST) - solo admin
router.route('/')
  .get(clientController.getClients)
  .post(isAdmin, validateCreateClient, clientController.createClient);

// Obtener, actualizar o eliminar un cliente específico
// GET - acceso general autenticado
// PUT - solo admin
// DELETE - solo admin (soft delete)
router.route('/:id')
  .get(clientController.getClientById)
  .put(isAdmin, validateUpdateClient, clientController.updateClient)
  .delete(isAdmin, clientController.deleteClient);

// ============================================
// GESTIÓN DE DIRECCIONES
// ============================================

// Agregar nueva dirección a un cliente - solo admin
router.post('/:id/addresses', isAdmin, validateAddAddress, clientController.addAddress);

// Actualizar una dirección específica - solo admin
router.put('/:id/addresses/:addressId', isAdmin, validateUpdateAddress, clientController.updateAddress);

// Eliminar una dirección específica - solo admin
router.delete('/:id/addresses/:addressId', isAdmin, clientController.deleteAddress);

// ============================================
// GESTIÓN DE PREFERENCIAS
// ============================================

// Actualizar preferencias del cliente - solo admin
router.put('/:id/preferences', isAdmin, validateUpdatePreferences, clientController.updatePreferences);

// ============================================
// CUENTA CORRIENTE (CRÉDITO)
// ============================================

// Habilitar cuenta corriente para un cliente - solo admin
router.post('/:id/credit/enable', isAdmin, validateEnableCredit, clientController.enableCredit);

// Deshabilitar cuenta corriente de un cliente - solo admin
router.post('/:id/credit/disable', isAdmin, clientController.disableCredit);

// Registrar pago a cuenta corriente - solo admin
router.post('/:id/credit/payment', isAdmin, validateCreditPayment, clientController.registerCreditPayment);

// Obtener resumen de cuenta corriente del cliente - acceso general autenticado
router.get('/:id/credit/summary', clientController.getCreditSummary);

// ============================================
// NUEVO: VERIFICAR LÍMITE DE CRÉDITO
// ============================================
// Verificar si el cliente tiene crédito disponible para un monto - acceso general autenticado
router.get('/:id/credit/check', clientController.checkCreditLimit);

// ============================================
// HISTORIAL DE COMPRAS
// ============================================

// Obtener historial de compras del cliente con filtros - acceso general autenticado
router.get('/:id/purchases', validateGetPurchaseHistory, clientController.getPurchaseHistory);

// ============================================
// NOTA: Las rutas con parámetros variables deben ir al final
// para evitar conflictos con rutas específicas
// ============================================

module.exports = router; 