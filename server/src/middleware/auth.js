const { verifyToken } = require("../utils/jwt");
const User = require("../models/user");

// Middleware para proteger rutas
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Verificar si el token está en el header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No autorizado. Inicia sesión para acceder",
      });
    }

    // Verificar token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Token inválido o expirado",
      });
    }

    // Verificar si el usuario aún existe
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "El usuario ya no existe",
      });
    }

    // Verificar si el usuario está activo
    if (!user.activo) {
      return res.status(401).json({
        success: false,
        message: "Tu cuenta está desactivada",
      });
    }

    // Verificar si cambió la contraseña después de emitir el token
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message:
          "La contraseña fue cambiada recientemente. Inicia sesión nuevamente",
      });
    }

    // Adjuntar usuario al request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware para restringir a admins
exports.restrictToAdmin = (req, res, next) => {
  if (!req.user.admin) {
    return res.status(403).json({
      success: false,
      message: "Acceso denegado. Se requieren permisos de administrador",
    });
  }
  next();
};

// Middleware opcional para verificar roles (para futuro)
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role || "user")) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para realizar esta acción",
      });
    }
    next();
  };
};
