// services/paymentGatewayService.js
const crypto = require('crypto');
const Sale = require('../models/Sale');
const Cart = require('../models/Cart');
const stockService = require('./stockService');
const emailService = require('./emailService');

// Configuración (usar variables de entorno)
const MERCADOPAGO_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'mi_secreto';

// Crear una preferencia de pago (simulado)
const createPaymentPreference = async (cartId, clientData, returnUrls) => {
  // 1. Obtener carrito y calcular total
  const cart = await Cart.findById(cartId).populate('items.productId');
  if (!cart || cart.items.length === 0) throw new Error('Carrito vacío');
  
  const total = cart.items.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0);
  const items = cart.items.map(item => ({
    title: item.productId.name,
    quantity: item.quantity,
    unit_price: item.priceAtTime,
    currency_id: 'ARS'
  }));
  
  // 2. Simular creación de preferencia (en producción llamar a Mercado Pago)
  // Aquí solo generamos un ID ficticio y devolvemos URL de checkout simulada
  const preferenceId = `pref_${Date.now()}_${cartId}`;
  const initPoint = `${process.env.FRONTEND_URL}/checkout?pref_id=${preferenceId}`; // simulado
  
  // Guardar la preferencia en la base de datos (opcional) o en memoria asociada al carrito
  // Podemos agregar un campo a Cart: paymentPreferenceId
  cart.paymentPreferenceId = preferenceId;
  await cart.save();
  
  return { preferenceId, initPoint };
};

// Procesar webhook de pago (simulado)
const processPaymentWebhook = async (paymentData, signature) => {
  // Verificar firma (simulado)
  // En producción verificar el signature con el webhook secret de MP.
  
  const { payment_id, status, external_reference } = paymentData;
  // external_reference debería contener el cartId o saleId
  const cartId = external_reference;
  const cart = await Cart.findById(cartId).populate('items.productId');
  if (!cart) throw new Error('Carrito no encontrado');
  
  if (status === 'approved') {
    // Crear la venta final
    const saleData = {
      clientId: cart.clientId,
      sellerId: null, // venta online no tiene vendedor asignado? Se podría asignar un vendedor por defecto o null
      items: cart.items.map(item => ({
        productId: item.productId._id,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPrice: item.priceAtTime,
        discount: 0,
        subtotal: item.priceAtTime * item.quantity,
        productName: item.productId.name,
        productSku: item.productId.sku // o variante sku
      })),
      subtotal: cart.calculateSubtotal(),
      discount: 0,
      tax: 0,
      total: cart.calculateSubtotal(),
      payments: [{
        method: 'credit_card', // o 'transfer' según el medio usado
        amount: cart.calculateSubtotal(),
        reference: payment_id,
        date: new Date()
      }],
      origin: 'ecommerce',
      orderStatus: 'paid',
      status: 'completed', // o 'processing'
      createdBy: cart.clientId ? cart.clientId : null,
      // dirección de envío podría estar en el cliente o en el carrito (habría que agregarla)
    };
    
    const sale = new Sale(saleData);
    await sale.save();
    
    // Descontar stock
    await stockService.deductStockForSale(sale.items, sale._id);
    
    // Vaciar carrito
    cart.items = [];
    await cart.save();
    
    // Enviar email de confirmación
    if (cart.clientId) {
      const client = await Client.findById(cart.clientId);
      if (client && client.email) {
        await emailService.sendSaleConfirmation(client.email, sale.saleNumber, sale.total, sale.items);
      }
    }
    
    return { success: true, sale };
  } else {
    // Manejar otros estados (rechazado, pendiente)
    return { success: false, status };
  }
};

module.exports = {
  createPaymentPreference,
  processPaymentWebhook
};