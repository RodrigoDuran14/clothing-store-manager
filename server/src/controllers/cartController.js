// controllers/cartController.js
const cartService = require('../services/cartService');
const { validationResult } = require('express-validator');

// Helper para obtener identificador de cliente/sesión desde request
const getCartIdentifiers = (req) => {
  // Si el usuario está autenticado, usamos su clientId (debe estar vinculado a un Partner? No, usamos su _id de User? 
  // En nuestra app, los clientes son independientes de los usuarios. Para ecommerce, el cliente se loguea con email.
  // Por simplicidad, asumimos que tenemos un campo clientId en req.user después de login de cliente.
  // Si no, usamos sessionId desde header o cookie.
  const clientId = req.user?.clientId || null;
  const sessionId = req.headers['x-session-id'] || null;
  if (!clientId && !sessionId) {
    // Generar nuevo sessionId si no existe (debería ser manejado por frontend)
    throw new Error('Se requiere identificación de sesión o cliente');
  }
  return { clientId, sessionId };
};

// Obtener carrito
exports.getCart = async (req, res, next) => {
  try {
    const identifiers = getCartIdentifiers(req);
    const cart = await cartService.getCartWithDetails(identifiers);
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// Agregar item
exports.addToCart = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    const { productId, size, color, quantity } = req.body;
    const identifiers = getCartIdentifiers(req);
    const cart = await cartService.addItemToCart({ ...identifiers, productId, size, color, quantity });
    res.status(201).json({ success: true, data: cart, message: 'Producto agregado al carrito' });
  } catch (error) {
    next(error);
  }
};

// Actualizar cantidad
exports.updateQuantity = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const identifiers = getCartIdentifiers(req);
    const cart = await cartService.updateItemQuantity({ ...identifiers, itemId, quantity });
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// Eliminar item
exports.removeItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const identifiers = getCartIdentifiers(req);
    const cart = await cartService.removeItem({ ...identifiers, itemId });
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// Vaciar carrito
exports.clearCart = async (req, res, next) => {
  try {
    const identifiers = getCartIdentifiers(req);
    const cart = await cartService.clearCart(identifiers);
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};