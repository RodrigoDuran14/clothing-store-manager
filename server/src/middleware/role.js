// Middleware para verificar roles específicos
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
    }

    // Verificar si el usuario tiene alguno de los roles permitidos
    const userRole = req.user.admin ? 'admin' : 'user';
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. No tienes permisos suficientes'
      });
    }
    
    next();
  };
};

// Middleware para verificar si es admin
const isAdmin = (req, res, next) => {
  if (!req.user || !req.user.admin) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador'
    });
  }
  next();
};

// Middleware para verificar si es el mismo usuario o admin
const isSameUserOrAdmin = (req, res, next) => {
  const userId = req.params.id;
  const currentUserId = req.user.id;
  
  if (req.user.admin || userId === currentUserId) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'No tienes permiso para acceder a este recurso'
  });
};

module.exports = {
  restrictTo,
  isAdmin,
  isSameUserOrAdmin
};