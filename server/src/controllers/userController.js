const User = require('../models/User');
const { filterObj, paginate, formatPagination } = require('../utils/helpers');
const { validationResult } = require('express-validator');

// @desc    Obtener todos los usuarios (admin)
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const { pagina = 1, limite = 10, activo, admin, search } = req.query;
    
    // Construir filtro
    const filter = {};
    if (activo !== undefined) filter.activo = activo === 'true';
    if (admin !== undefined) filter.admin = admin === 'true';
    
    // Búsqueda por nombre o email
    if (search) {
      filter.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const { skip, limit, page } = paginate(pagina, limite);
    
    const users = await User.find(filter)
      .select('-__v') // Excluir versión
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await User.countDocuments(filter);
    const pagination = formatPagination(total, page, limit);
    
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
    const user = await User.findById(req.params.id).select('-__v');
    
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
    
    const { nombre, email, password, telefono, admin } = req.body;
    
    // Verificar si el email ya existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }
    
    const user = await User.create({
      nombre,
      email,
      password,
      telefono,
      admin: admin || false
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
        message: 'Para actualizar contraseña usa la ruta /api/auth/updatepassword'
      });
    }
    
    // Campos permitidos para actualización
    const allowedFields = ['nombre', 'email', 'telefono', 'admin', 'activo'];
    const filteredBody = filterObj(req.body, ...allowedFields);
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    ).select('-__v');
    
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
    
    // No permitir eliminar el último admin
    if (user.admin) {
      const adminCount = await User.countDocuments({ admin: true });
      if (adminCount === 1) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar el único administrador del sistema'
        });
      }
    }
    
    // Soft delete: desactivar usuario en lugar de eliminar
    user.activo = false;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Usuario desactivado exitosamente',
      data: { id: user._id, activo: false }
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
    
    user.activo = true;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Usuario reactivado exitosamente',
      data: { id: user._id, activo: true }
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
    
    // No permitir eliminar el último admin
    if (user.admin) {
      const adminCount = await User.countDocuments({ admin: true });
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

// @desc    Estadísticas de usuarios
// @route   GET /api/users/stats
// @access  Private/Admin
exports.getUserStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ activo: true });
    const inactiveUsers = await User.countDocuments({ activo: false });
    const adminUsers = await User.countDocuments({ admin: true });
    const regularUsers = totalUsers - adminUsers;
    
    // Usuarios registrados en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    res.status(200).json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        admins: adminUsers,
        regularUsers: regularUsers,
        newUsersLast30Days: newUsers
      }
    });
  } catch (error) {
    next(error);
  }
};