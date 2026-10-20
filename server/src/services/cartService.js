// services/cartService.js
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { v4: uuidv4 } = require('uuid'); // necesitas instalar uuid

// Obtener o crear carrito para un cliente o sesión
const getOrCreateCart = async ({ clientId = null, sessionId = null }) => {
  if (!clientId && !sessionId) {
    throw new Error('Se requiere clientId o sessionId');
  }

  let cart = await Cart.findOne({ $or: [{ clientId }, { sessionId }] });
  if (!cart) {
    cart = new Cart({ clientId, sessionId });
    await cart.save();
  }
  return cart;
};

// Agregar item al carrito
const addItemToCart = async ({ clientId, sessionId, productId, size, color, quantity }) => {
  const cart = await getOrCreateCart({ clientId, sessionId });
  
  const product = await Product.findById(productId);
  if (!product) throw new Error('Producto no encontrado');
  
  // Verificar que la variante exista y tenga stock suficiente (opcional, se puede verificar al checkout)
  const variant = product.variants.find(v => v.size === size && v.color === color);
  if (!variant) throw new Error('Variante no disponible');
  
  // Precio actual del producto
  const priceAtTime = product.price;
  
  // Buscar si el mismo producto/variante ya está en el carrito
  const existingItem = cart.items.find(item =>
    item.productId.toString() === productId &&
    item.size === size &&
    item.color === color
  );
  
  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.priceAtTime = priceAtTime; // actualizar precio por si cambió
  } else {
    cart.items.push({
      productId,
      size,
      color,
      quantity,
      priceAtTime,
      discountAtTime: 0
    });
  }
  
  await cart.save();
  return cart;
};

// Actualizar cantidad de un item
const updateItemQuantity = async ({ clientId, sessionId, itemId, quantity }) => {
  const cart = await getOrCreateCart({ clientId, sessionId });
  const item = cart.items.id(itemId);
  if (!item) throw new Error('Item no encontrado en el carrito');
  
  if (quantity <= 0) {
    item.remove();
  } else {
    item.quantity = quantity;
  }
  await cart.save();
  return cart;
};

// Eliminar item del carrito
const removeItem = async ({ clientId, sessionId, itemId }) => {
  const cart = await getOrCreateCart({ clientId, sessionId });
  cart.items.id(itemId).remove();
  await cart.save();
  return cart;
};

// Vaciar carrito
const clearCart = async ({ clientId, sessionId }) => {
  const cart = await getOrCreateCart({ clientId, sessionId });
  cart.items = [];
  await cart.save();
  return cart;
};

// Obtener carrito con detalles de productos
const getCartWithDetails = async ({ clientId, sessionId }) => {
  const cart = await getOrCreateCart({ clientId, sessionId });
  await cart.populate('items.productId', 'name images price variants description');
  return cart;
};

module.exports = {
  getOrCreateCart,
  addItemToCart,
  updateItemQuantity,
  removeItem,
  clearCart,
  getCartWithDetails
};