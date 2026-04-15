const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Importar configuración de base de datos
const connectDB = require('./src/config/database');

// Importar rutas
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const productRoutes = require('./src/routes/productRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const supplierRoutes = require('./src/routes/supplierRoutes');
const clientRoutes = require('./src/routes/clientRoutes');
const sellerRoutes = require('./src/routes/sellerRoutes');

// Importar middleware de errores
const errorHandler = require('./src/middleware/errorHandler');

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