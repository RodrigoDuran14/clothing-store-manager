// models/Customer.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const customerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'El apellido es obligatorio'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false
  },
  phone: {
    type: String,
    trim: true
  },
  addresses: [{
    alias: { type: String, default: 'casa' }, // casa, trabajo, otro
    street: { type: String, required: true },
    number: { type: String, required: true },
    floor: String,
    apartment: String,
    city: { type: String, required: true },
    province: { type: String, required: true },
    zipCode: String,
    isDefault: { type: Boolean, default: false }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});

// Hash password antes de guardar
customerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.updatedAt = new Date();
  next();
});

// Comparar contraseña
customerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Customer', customerSchema);