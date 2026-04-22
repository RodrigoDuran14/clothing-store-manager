const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

// Configurar transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.SMTP_PASS
  }
});

// Cargar plantilla Handlebars
const loadTemplate = (templateName) => {
  const templatePath = path.join(__dirname, '../templates/email', `${templateName}.hbs`);
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  return handlebars.compile(templateContent);
};

// Enviar email
const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Mi Tienda" <noreply@mitienda.com>',
      to,
      subject,
      html,
      attachments
    };
    
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

// Enviar factura
const sendInvoiceEmail = async (to, invoiceNumber, pdfBuffer) => {
  const template = loadTemplate('invoice');
  const html = template({
    invoiceNumber,
    date: new Date().toLocaleDateString('es-AR')
  });
  
  return sendEmail(to, `Factura ${invoiceNumber}`, html, [
    {
      filename: `factura-${invoiceNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }
  ]);
};

// Enviar alerta de stock bajo
const sendLowStockAlert = async (to, products) => {
  const template = loadTemplate('lowStockAlert');
  const html = template({
    products,
    date: new Date().toLocaleDateString('es-AR')
  });
  
  return sendEmail(to, '⚠️ Alerta: Stock Bajo', html);
};

// Enviar alerta de crédito
const sendCreditAlert = async (to, clientName, balance, creditLimit) => {
  const template = loadTemplate('creditAlert');
  const html = template({
    clientName,
    balance,
    creditLimit,
    usagePercentage: ((balance / creditLimit) * 100).toFixed(1),
    date: new Date().toLocaleDateString('es-AR')
  });
  
  return sendEmail(to, '⚠️ Alerta: Límite de Crédito', html);
};

// Enviar confirmación de venta
const sendSaleConfirmation = async (to, saleNumber, total, items) => {
  const template = loadTemplate('saleConfirmation');
  const html = template({
    saleNumber,
    total: total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
    items,
    date: new Date().toLocaleDateString('es-AR')
  });
  
  return sendEmail(to, `Confirmación de Compra - Ticket ${saleNumber}`, html);
};

module.exports = {
  sendEmail,
  sendInvoiceEmail,
  sendLowStockAlert,
  sendCreditAlert,
  sendSaleConfirmation
};