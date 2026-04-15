const User = require('../models/user');
const bcrypt = require('bcryptjs');
const { filterObj, paginate, formatPagination } = require('../utils/helpers');
const { validationResult } = require('express-validator');

// @desc    Obtener todos los usuarios (admin)
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      isActive, 
      isAdmin, 
      search 
    } = req.query;
    
    // Construir filtro de búsqueda
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isAdmin !== undefined) filter.isAdmin = isAdmin === 'true';
    
    // Búsqueda por nombre o email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    const users = await User.find(filter)
      .select('-__v') // Excluir versión
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitValue);
    
    const total = await User.countDocuments(filter);
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: users,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener usuario por ID
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-__v -password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener perfil del usuario autenticado
// @route   GET /api/users/profile
// @access  Private
exports.getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-__v -password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar perfil del usuario autenticado
// @route   PUT /api/users/profile
// @access  Private
exports.updateMyProfile = async (req, res, next) => {
  try {
    // Campos permitidos para actualización de perfil propio
    const allowedFields = ['name', 'email', 'phone', 'image'];
    const filteredBody = filterObj(req.body, ...allowedFields);
    
    // Verificar si el email ya existe (si se está actualizando)
    if (filteredBody.email) {
      filteredBody.email = filteredBody.email.toLowerCase();
      const existingUser = await User.findOne({
        email: filteredBody.email,
        _id: { $ne: req.user.id }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro usuario con este email'
        });
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    ).select('-__v -password');
    
    res.status(200).json({
      success: true,
      data: user,
      message: 'Perfil actualizado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear usuario (admin)
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { name, email, password, phone, isAdmin, image } = req.body;
    
    // Verificar si el email ya existe
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }
    
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      isAdmin: isAdmin || false,
      image: image || `https://ui-avatars.com/api/?background=0D8F81&color=fff&bold=true&name=${encodeURIComponent(name)}`
    });
    
    // Remover password de la respuesta
    user.password = undefined;
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'Usuario creado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar usuario (admin)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    // No permitir actualizar contraseña aquí
    if (req.body.password) {
      return res.status(400).json({
        success: false,
        message: 'Para actualizar contraseña usa la ruta /api/auth/update-password'
      });
    }
    
    // Campos permitidos para actualización por admin
    const allowedFields = ['name', 'email', 'phone', 'isAdmin', 'isActive', 'image'];
    const filteredBody = filterObj(req.body, ...allowedFields);
    
    // Verificar email único si se está actualizando
    if (filteredBody.email) {
      filteredBody.email = filteredBody.email.toLowerCase();
      const existingUser = await User.findOne({
        email: filteredBody.email,
        _id: { $ne: req.params.id }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro usuario con este email'
        });
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    ).select('-__v -password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user,
      message: 'Usuario actualizado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar usuario (soft delete - desactivar)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // No permitir desactivar al propio usuario
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propio usuario'
      });
    }
    
    // No permitir eliminar el último admin
    if (user.isAdmin) {
      const adminCount = await User.countDocuments({ isAdmin: true });
      if (adminCount === 1) {
        return res.status(400).json({
          success: false,
          message: 'No se puede desactivar el único administrador del sistema'
        });
      }
    }
    
    // Soft delete: desactivar usuario en lugar de eliminar
    user.isActive = false;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Usuario desactivado exitosamente',
      data: { id: user._id, isActive: false }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reactivar usuario
// @route   PUT /api/users/:id/reactivate
// @access  Private/Admin
exports.reactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    user.isActive = true;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Usuario reactivado exitosamente',
      data: { id: user._id, isActive: true }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar usuario permanentemente (solo para casos extremos)
// @route   DELETE /api/users/:id/permanent
// @access  Private/Admin
exports.permanentDeleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // No permitir eliminar al propio usuario
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propio usuario'
      });
    }
    
    // No permitir eliminar el último admin
    if (user.isAdmin) {
      const adminCount = await User.countDocuments({ isAdmin: true });
      if (adminCount === 1) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar el único administrador del sistema'
        });
      }
    }
    
    await user.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Usuario eliminado permanentemente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cambiar contraseña del usuario autenticado
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren contraseña actual y nueva contraseña'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }
    
    // Obtener usuario con contraseña
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Verificar contraseña actual
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }
    
    // Actualizar contraseña
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Estadísticas de usuarios
// @route   GET /api/users/stats
// @access  Private/Admin
exports.getUserStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    const adminUsers = await User.countDocuments({ isAdmin: true });
    const regularUsers = totalUsers - adminUsers;
    
    // Usuarios registrados en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    // Usuarios que no han iniciado sesión
    const neverLoggedIn = await User.countDocuments({
      lastLogin: null
    });
    
    // Usuarios activos en el último mes (con login)
    const activeLastMonth = await User.countDocuments({
      lastLogin: { $gte: thirtyDaysAgo }
    });
    
    res.status(200).json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        admins: adminUsers,
        regularUsers: regularUsers,
        newUsersLast30Days: newUsers,
        neverLoggedIn,
        activeLastMonth
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar último login del usuario
// @route   PATCH /api/users/:id/last-login
// @access  Private/Admin (o interno)
exports.updateLastLogin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    user.lastLogin = new Date();
    await user.save();
    
    res.status(200).json({
      success: true,
      data: { lastLogin: user.lastLogin }
    });
  } catch (error) {
    next(error);
  }
};