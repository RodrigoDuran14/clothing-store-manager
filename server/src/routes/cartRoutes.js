const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/Auth'); // usaremos protect para clientes? Necesitamos un middleware de cliente.
// Para ecommerce, podemos tener un middleware que valide token de cliente (separado del usuario admin).
// Por ahora, asumimos que el endpoint es público con sessionId. Pero protegeremos las rutas que modifican carrito con un auth opcional.

// Todas las rutas de carrito serán accesibles con sessionId (anónimo) o con token de cliente.
router.route('/')
  .get(cartController.getCart)
  .delete(cartController.clearCart);

router.post('/items', cartController.addToCart);
router.put('/items/:itemId', cartController.updateQuantity);
router.delete('/items/:itemId', cartController.removeItem);

module.exports = router;