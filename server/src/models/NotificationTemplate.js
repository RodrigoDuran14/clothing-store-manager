const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema({
  name: {  // Nombre interno de la plantilla
    type: String,
    required: true,
    unique: true,
    trim: true
  },
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
    required: true,
    unique: true
  },
  subject: {  // Asunto (para email)
    type: String,
    required: true
  },
  title: {  // Título (para push/in-app)
    type: String,
    required: true
  },
  body: {  // Cuerpo del mensaje (soporta variables {{variable}})
    type: String,
    required: true
  },
  htmlBody: {  // Versión HTML (para email)
    type: String
  },
  variables: [{  // Variables que puede usar la plantilla
    name: String,
    description: String,
    required: Boolean
  }],
  channels: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Método: renderizar plantilla con variables
notificationTemplateSchema.methods.render = function(variables) {
  let renderedBody = this.body;
  let renderedHtml = this.htmlBody || this.body;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    renderedBody = renderedBody.replace(regex, value);
    if (renderedHtml) {
      renderedHtml = renderedHtml.replace(regex, value);
    }
  }
  
  return {
    subject: this.subject,
    title: this.title,
    body: renderedBody,
    htmlBody: renderedHtml
  };
};

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);