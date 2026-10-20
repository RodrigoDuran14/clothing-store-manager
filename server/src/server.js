const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Importar configuración de base de datos
const connectDB = require('./config/database')

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const clientRoutes = require('./routes/clientRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const saleRoutes = require('./routes/saleRoutes');
const returnRoutes = require('./routes/returnRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const bankAccountRoutes = require('./routes/bankAccountRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const partnerSplitRoutes = require('./routes/partnerSplitRoutes');
const cashRoutes = require('./routes/cashRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const notificationJobs = require('./jobs/notificationJobs');
const cartRoutes = require('./routes/cartRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const auditRoutes = require('./routes/auditRoutes');
const customerRoutes = require('./routes/customerRoutes');

// Importar middleware de errores
const errorHandler = require('./middleware/errorHandler');

// Conectar a MongoDB
connectDB();

const app = express();

// Middleware globales
app.use(helmet()); // Seguridad: oculta headers y agrega protecciones
app.use(cors()); // Permitir peticiones de otros dominios
app.use(express.json()); // Parsear JSON
app.use(express.urlencoded({ extended: true })); // Parsear URL encoded
app.use(morgan('dev')); // Logging de peticiones HTTP

// Servir archivos estáticos (opcional)
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/partner-splits', partnerSplitRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/customers', customerRoutes);


// Iniciar jobs
notificationJobs.startNotificationJobs();


// Ruta base para verificar API
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API de Clothing Store Manager',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth'
    }
  });
});

// Middleware para manejar rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.url}`
  });
});

// Middleware global de errores (siempre al final)
app.use(errorHandler);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
  🚀 Servidor iniciado correctamente
  📡 Puerto: ${PORT}
  🌐 Entorno: ${process.env.NODE_ENV || 'development'}
  🔗 URL: http://localhost:${PORT}
  📝 Health check: http://localhost:${PORT}/health
  `);
});

// Manejar errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('❌ Error no manejado (rejection):', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('❌ Error no capturado (exception):', err);
  server.close(() => process.exit(1));
});