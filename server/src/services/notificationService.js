const Notification = require('../models/Notification');
const NotificationTemplate = require('../models/NotificationTemplate');
const emailService = require('./emailService');

// Crear y enviar notificación
const sendNotification = async (notificationData) => {
  const {
    recipient,
    type,
    variables,
    channels,
    priority,
    scheduledFor,
    createdBy
  } = notificationData;
  
  // Obtener plantilla
  const template = await NotificationTemplate.findOne({ type, isActive: true });
  if (!template) {
    throw new Error(`Template not found for type: ${type}`);
  }
  
  // Renderizar contenido
  const rendered = template.render(variables);
  
  // Crear notificación en BD
  const notification = new Notification({
    userId: recipient.userId,
    partnerId: recipient.partnerId,
    clientId: recipient.clientId,
    sellerId: recipient.sellerId,
    email: recipient.email,
    phone: recipient.phone,
    type,
    title: rendered.title,
    message: rendered.body,
    data: variables,
    channels: channels || {
      email: template.channels.email,
      sms: template.channels.sms,
      push: template.channels.push,
      whatsapp: template.channels.whatsapp,
      inApp: template.channels.inApp
    },
    priority: priority || 'medium',
    scheduledFor: scheduledFor || new Date(),
    createdBy
  });
  
  await notification.save();
  
  // Enviar inmediatamente si no está programada
  if (!scheduledFor || scheduledFor <= new Date()) {
    await processNotification(notification);
  }
  
  return notification;
};

// Procesar notificación (enviar por canales)
const processNotification = async (notification) => {
  const channels = notification.channels;
  let sent = false;
  
  // Email
  if (channels.email && notification.email) {
    try {
      await emailService.sendEmail(
        notification.email,
        notification.title,
        notification.message
      );
      sent = true;
    } catch (error) {
      console.error(`Email failed for notification ${notification._id}:`, error);
    }
  }
  
  // In-App (siempre disponible)
  if (channels.inApp) {
    sent = true;
  }
  
  if (sent) {
    await notification.markAsSent();
  } else {
    await notification.markAsFailed('No channels available or all failed');
  }
  
  return notification;
};

// Notificar stock bajo
const notifyLowStock = async (products) => {
  // Buscar usuarios que deben recibir alertas (admins, socios)
  const User = require('../models/user');
  const admins = await User.find({ isAdmin: true, isActive: true });
  
  for (const admin of admins) {
    await sendNotification({
      recipient: { userId: admin._id, email: admin.email },
      type: 'low_stock',
      variables: {
        products: products.map(p => `${p.productName} - ${p.size} ${p.color}: ${p.stock} unidades`).join('\n'),
        count: products.length
      },
      channels: { email: true, inApp: true },
      priority: 'high'
    });
  }
};

// Notificar alerta de crédito
const notifyCreditAlert = async (client) => {
  const User = require('../models/user');
  const admins = await User.find({ isAdmin: true, isActive: true });
  
  for (const admin of admins) {
    await sendNotification({
      recipient: { userId: admin._id, email: admin.email },
      type: 'credit_alert',
      variables: {
        clientName: client.name,
        balance: client.creditAccount.balance,
        creditLimit: client.creditAccount.creditLimit,
        usagePercentage: ((client.creditAccount.balance / client.creditAccount.creditLimit) * 100).toFixed(1)
      },
      channels: { email: true, inApp: true },
      priority: 'high'
    });
  }
  
  // También notificar al cliente
  if (client.email) {
    await sendNotification({
      recipient: { clientId: client._id, email: client.email },
      type: 'credit_alert',
      variables: {
        clientName: client.name,
        balance: client.creditAccount.balance,
        creditLimit: client.creditAccount.creditLimit,
        usagePercentage: ((client.creditAccount.balance / client.creditAccount.creditLimit) * 100).toFixed(1)
      },
      channels: { email: true, inApp: false },
      priority: 'medium'
    });
  }
};

// Notificar nueva venta
const notifyNewSale = async (sale) => {
  const User = require('../models/user');
  const admins = await User.find({ isAdmin: true, isActive: true });
  
  for (const admin of admins) {
    await sendNotification({
      recipient: { userId: admin._id, email: admin.email },
      type: 'new_sale',
      variables: {
        saleNumber: sale.saleNumber,
        total: sale.total,
        clientName: sale.clientId?.name || 'Consumidor Final',
        date: new Date().toLocaleDateString('es-AR')
      },
      channels: { email: false, inApp: true },
      priority: 'medium'
    });
  }
};

// Notificar cliente sobre su compra
const notifyClientSaleConfirmation = async (sale, client) => {
  if (!client.email) return;
  
  await sendNotification({
    recipient: { clientId: client._id, email: client.email },
    type: 'sale_confirmation',
    variables: {
      saleNumber: sale.saleNumber,
      total: sale.total,
      items: sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', '),
      date: new Date().toLocaleDateString('es-AR')
    },
    channels: { email: true, inApp: false },
    priority: 'medium'
  });
};

module.exports = {
  sendNotification,
  processNotification,
  notifyLowStock,
  notifyCreditAlert,
  notifyNewSale,
  notifyClientSaleConfirmation
};