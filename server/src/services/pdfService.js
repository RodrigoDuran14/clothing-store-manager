const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');

// Registrar helpers de Handlebars
handlebars.registerHelper('formatNumber', (number) => {
  if (!number) return '$0';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(number);
});

handlebars.registerHelper('formatDate', (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
});

// Helper para formato de moneda
handlebars.registerHelper('currency', (number) => {
  if (!number && number !== 0) return '$0';
  return `$${number.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
});

handlebars.registerHelper('multiply', (a, b) => a * b);
handlebars.registerHelper('sum', (a, b) => a + b);

// Leer plantilla
const getTemplate = () => {
  const templatePath = path.join(__dirname, '../templates/pdf/invoice.hbs');
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  return handlebars.compile(templateContent);
};

// Generar PDF de factura
const generateInvoicePDF = async (invoiceData) => {
  let browser = null;
  
  try {
    const template = getTemplate();
    const html = template(invoiceData);
    
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm'
      }
    });
    
    return pdf;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF invoice');
  } finally {
    if (browser) await browser.close();
  }
};

// Guardar PDF en archivo
const savePDF = async (pdfBuffer, invoiceNumber) => {
  const uploadDir = path.join(__dirname, '../../uploads/invoices');
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const filename = `invoice-${invoiceNumber}.pdf`;
  const filepath = path.join(uploadDir, filename);
  
  fs.writeFileSync(filepath, pdfBuffer);
  
  return `/uploads/invoices/${filename}`;
};

// Enviar factura por email
const sendInvoiceByEmail = async (email, invoiceNumber, pdfBuffer) => {
  // Aquí se integraría con un servicio de email (nodemailer, sendgrid, etc.)
  console.log(`Sending invoice ${invoiceNumber} to ${email}`);
  
  // Simulación
  return { success: true, message: `Invoice sent to ${email}` };
};

module.exports = {
  generateInvoicePDF,
  savePDF,
  sendInvoiceByEmail
};