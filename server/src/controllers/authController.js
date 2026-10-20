const User = require("../models/user");
const { createSendToken, verifyToken } = require("../utils/jwt");
const { validationResult } = require("express-validator");
const auditService = require("../services/auditService");

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

    const { name, email, password, phone, image } = req.body;

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "El email ya está registrado",
      });
    }

    // Crear usuario (los admins solo pueden crearse manualmente en BD)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      isAdmin: false, // Por defecto no es admin
      image: image || `https://ui-avatars.com/api/?background=0D8F81&color=fff&bold=true&name=${encodeURIComponent(name)}`
    });

    await auditService.logAction({
          userId: user.id,
          userEmail: user.email,
          userRole: 'admin',
          action: 'CREATE',
          entity: 'User',
          entityId: user._id,
          newData: { name: user.name, email: user.email, isAdmin: user.isAdmin },
          req
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
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Tu cuenta está desactivada. Contacta al administrador",
      });
    }

    // Actualizar último login
    user.lastLogin = Date.now();

    // --- LOG ---
    await auditService.logAction({
      userId: user._id,
      userEmail: user.email,
      userRole: user.isAdmin ? "admin" : "user",
      action: "LOGIN",
      entity: "User",
      entityId: user._id,
      newData: { lastLogin: new Date() },
      req,
    });

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

// @desc    Logout (invalidar token - cliente debe eliminar token)
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    // El cliente debe eliminar el token del lado del frontend
    // Aquí solo respondemos exitosamente y registramos el log
    await auditService.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.isAdmin ? "admin" : "user",
      action: "LOGOUT",
      entity: "User",
      entityId: req.user.id,
      req,
    });
    res.status(200).json({
      success: true,
      message: "Sesión cerrada exitosamente",
    });
  } catch (error) {
    next(error);
  }
};
