const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Destinatario
  userId: {  // Usuario del sistema que recibe la notificación
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  partnerId: {  // Socio que recibe la notificación
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner'
  },
  clientId: {  // Cliente que recibe la notificación
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  sellerId: {  // Vendedor que recibe la notificación
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller'
  },
  email: {  // Email directo (para no registrados)
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {  // Teléfono para SMS/WhatsApp
    type: String,
    trim: true
  },
  
  // Contenido
  type: {  // Tipo de notificación
    type: String,
    enum: [
      'welcome',
      'invoice',
      'low_stock',
      'credit_alert',
      'sale_confirmation',
      'return_processed',
      'promotion_expiring',
      'payment_reminder',
      'new_sale',
      'new_client',
      'system_alert'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  data: {  // Datos adicionales (ej: saleId, productId, etc.)
    type: mongoose.Schema.Types.Mixed
  },
  
  // Canales de envío
  channels: {
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true }
  },
  
  // Estado
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'read'],
    default: 'pending'
  },
  
  // Fechas
  scheduledFor: {  // Fecha programada (null = enviar ahora)
    type: Date,
    default: Date.now
  },
  sentAt: Date,
  readAt: Date,
  
  // Metadatos
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  attempts: {  // Intentos de envío
    type: Number,
    default: 0
  },
  lastError: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices
notificationSchema.index({ userId: 1 });
notificationSchema.index({ clientId: 1 });
notificationSchema.index({ partnerId: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

// Virtual: notificación no leída
notificationSchema.virtual('isUnread').get(function() {
  return this.status === 'pending' || this.status === 'sent';
});

// Método: marcar como leída
notificationSchema.methods.markAsRead = async function() {
  this.status = 'read';
  this.readAt = new Date();
  await this.save();
  return this;
};

// Método: marcar como enviada
notificationSchema.methods.markAsSent = async function() {
  this.status = 'sent';
  this.sentAt = new Date();
  await this.save();
  return this;
};

// Método: registrar fallo
notificationSchema.methods.markAsFailed = async function(error) {
  this.status = 'failed';
  this.attempts += 1;
  this.lastError = error;
  await this.save();
  return this;
};

// Método estático: obtener notificaciones no leídas por usuario
notificationSchema.statics.getUnreadByUser = async function(userId) {
  return this.find({
    userId,
    status: { $in: ['pending', 'sent'] }
  }).sort({ createdAt: -1 });
};

// Método estático: marcar todas como leídas
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { userId, status: { $in: ['pending', 'sent'] } },
    { status: 'read', readAt: new Date() }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);