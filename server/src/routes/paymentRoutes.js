const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentGatewayService');
const { protect } = require('../middleware/Auth'); // opcional, para crear preferencia solo para clientes logueados

// Crear preferencia de pago (requiere autenticación de cliente o sessionId)
router.post('/create-preference', async (req, res, next) => {
  try {
    const { cartId, clientData, returnUrls } = req.body;
    // Se puede obtener cartId desde el carrito actual del usuario
    const result = await paymentService.createPaymentPreference(cartId, clientData, returnUrls);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Webhook de notificación (público, sin autenticación)
router.post('/webhook', async (req, res, next) => {
  try {
    const paymentData = req.body;
    const signature = req.headers['x-signature'];
    const result = await paymentService.processPaymentWebhook(paymentData, signature);
    res.json({ success: true, data: result });
  } catch (error) {
    // Siempre responder 200 a Mercado Pago para evitar reenvíos
    res.status(200).json({ success: false, message: error.message });
  }
});

module.exports = router;