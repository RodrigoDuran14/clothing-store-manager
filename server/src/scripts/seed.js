const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');

const createAdmin = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe un admin
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (adminExists) {
      console.log('⚠️ El administrador ya existe');
      process.exit(0);
    }

    // Crear admin
    const admin = await User.create({
      nombre: 'Administrador',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      admin: true,
      activo: true
    });

    console.log('✅ Administrador creado exitosamente:');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Contraseña: ${process.env.ADMIN_PASSWORD}`);
    console.log('⚠️ ¡Cambia la contraseña después del primer inicio de sesión!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdmin();