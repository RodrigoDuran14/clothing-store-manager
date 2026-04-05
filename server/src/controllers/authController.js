const User = require("../models/User");
const { createSendToken, verifyToken } = require("../utils/jwt");
const { validationResult } = require("express-validator");

// @desc    Registrar nuevo usuario
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    // Validar errores de express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { nombre, email, password, telefono } = req.body;

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "El email ya está registrado",
      });
    }

    // Crear usuario (los admins solo pueden crearse manualmente en BD)
    const user = await User.create({
      nombre,
      email,
      password,
      telefono,
      admin: false, // Por defecto no es admin
    });

    createSendToken(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login de usuario
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validar que existan email y password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Por favor proporciona email y contraseña",
      });
    }

    // Buscar usuario y seleccionar password (por defecto no se selecciona)
    const user = await User.findOne({ email }).select("+password");

    // Verificar si existe y si la contraseña es correcta
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Email o contraseña incorrectos",
      });
    }

    // Verificar si el usuario está activo
    if (!user.activo) {
      return res.status(401).json({
        success: false,
        message: "Tu cuenta está desactivada. Contacta al administrador",
      });
    }

    // Actualizar último login
    user.ultimoLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener perfil del usuario autenticado
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar perfil propio
// @route   PUT /api/auth/updateme
// @access  Private
exports.updateMe = async (req, res, next) => {
  try {
    // No permitir actualizar password aquí (tiene su propia ruta)
    if (req.body.password) {
      return res.status(400).json({
        success: false,
        message: "Para actualizar contraseña usa la ruta /updatepassword",
      });
    }

    // Campos permitidos
    const allowedFields = ["nombre", "telefono", "imagen"];
    const updates = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar contraseña
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Por favor proporciona contraseña actual y nueva",
      });
    }

    // Obtener usuario con password
    const user = await User.findById(req.user.id).select("+password");

    // Verificar contraseña actual
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: "Contraseña actual incorrecta",
      });
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout (invalidar token - cliente debe eliminar token)
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    // El cliente debe eliminar el token del lado del frontend
    // Aquí solo respondemos exitosamente
    res.status(200).json({
      success: true,
      message: "Sesión cerrada exitosamente",
    });
  } catch (error) {
    next(error);
  }
};
