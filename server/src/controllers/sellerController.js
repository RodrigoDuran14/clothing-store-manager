const Seller = require('../models/Seller');
const User = require('../models/user');
const Sale = require('../models/Sale');
const { filterObj, paginate, formatPagination } = require('../utils/helpers');
const commissionService = require('../services/commissionService');

// @desc    Obtener todos los vendedores
// @route   GET /api/sellers
// @access  Private
exports.getSellers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      active,
      position,
      search,
      orderBy = 'fullName'
    } = req.query;
    
    // Construir filtro de búsqueda
    const filter = {};
    if (active !== undefined) filter.active = active === 'true';
    if (position) filter.position = position;
    
    // Búsqueda por nombre, email, documento o ID de empleado
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { document: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Configurar ordenamiento
    let sort = {};
    switch(orderBy) {
      case 'fullName':
        sort = { firstName: 1, lastName: 1 };
        break;
      case 'totalSales':
        sort = { totalSales: -1 };
        break;
      case 'monthlySales':
        sort = { monthlySales: -1 };
        break;
      case 'commissionRate':
        sort = { commissionRate: -1 };
        break;
      case 'totalCommission':
        sort = { totalCommission: -1 };
        break;
      case 'salesCount':
        sort = { salesCount: -1 };
        break;
      default:
        sort = { firstName: 1, lastName: 1 };
    }
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    const sellers = await Seller.find(filter)
      .populate('userId', 'name email image role')
      .sort(sort)
      .skip(skip)
      .limit(limitValue);
    
    // Agregar información virtual a cada vendedor
    const sellersWithVirtuals = sellers.map(seller => ({
      ...seller.toObject(),
      fullName: seller.fullName,
      age: seller.age,
      lastMonthSales: seller.lastMonthSales
    }));
    
    const total = await Seller.countDocuments(filter);
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: sellersWithVirtuals,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener vendedor por ID
// @route   GET /api/sellers/:id
// @access  Private
exports.getSellerById = async (req, res, next) => {
  try {
    const seller = await Seller.findById(req.params.id)
      .populate('userId', 'name email image role');
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado'
      });
    }
    
    // Agregar información virtual
    const sellerData = {
      ...seller.toObject(),
      fullName: seller.fullName,
      age: seller.age,
      lastMonthSales: seller.lastMonthSales
    };
    
    res.status(200).json({
      success: true,
      data: sellerData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear vendedor
// @route   POST /api/sellers
// @access  Private/Admin
exports.createSeller = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      phone2,
      document,
      documentType,
      birthDate,
      address,
      position,
      hireDate,
      commissionRate,
      commissionType,
      fixedCommissionAmount,
      commissionTiers,
      shifts,
      notes,
      userId
    } = req.body;
    
    // Verificar si ya existe por email
    const existingSeller = await Seller.findOne({ email: email.toLowerCase() });
    if (existingSeller) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un vendedor con este email'
      });
    }
    
    // Verificar documento si fue proporcionado
    if (document) {
      const existingDocument = await Seller.findOne({ document });
      if (existingDocument) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un vendedor con este documento'
        });
      }
    }
    
    // Verificar userId si fue proporcionado
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      const existingUser = await Seller.findOne({ userId });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Este usuario ya está vinculado a un vendedor'
        });
      }
    }
    
    const seller = await Seller.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      phone2,
      document,
      documentType: documentType || 'DNI',
      birthDate,
      address: address || {},
      position: position || 'salesperson',
      hireDate: hireDate || new Date(),
      commissionRate: commissionRate || 5,
      commissionType: commissionType || 'percentage',
      fixedCommissionAmount: fixedCommissionAmount || 0,
      commissionTiers: commissionTiers || [],
      shifts: shifts || [],
      notes,
      userId: userId || null
    });
    
    res.status(201).json({
      success: true,
      data: {
        ...seller.toObject(),
        fullName: seller.fullName
      },
      message: 'Vendedor creado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar vendedor
// @route   PUT /api/sellers/:id
// @access  Private/Admin
exports.updateSeller = async (req, res, next) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone', 'phone2', 'document',
      'documentType', 'birthDate', 'address', 'position', 'active',
      'commissionRate', 'commissionType', 'fixedCommissionAmount',
      'commissionTiers', 'shifts', 'notes', 'userId', 'terminationDate'
    ];
    
    const filteredBody = filterObj(req.body, ...allowedFields);
    
    // Validar email único si se está actualizando
    if (filteredBody.email) {
      filteredBody.email = filteredBody.email.toLowerCase();
      const existingSeller = await Seller.findOne({
        email: filteredBody.email,
        _id: { $ne: req.params.id }
      });
      
      if (existingSeller) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro vendedor con este email'
        });
      }
    }
    
    // Validar documento único si se está actualizando
    if (filteredBody.document) {
      const existingDocument = await Seller.findOne({
        document: filteredBody.document,
        _id: { $ne: req.params.id }
      });
      
      if (existingDocument) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro vendedor con este documento'
        });
      }
    }
    
    // Validar userId si se está actualizando
    if (filteredBody.userId) {
      const user = await User.findById(filteredBody.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      const existingUser = await Seller.findOne({
        userId: filteredBody.userId,
        _id: { $ne: req.params.id }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Este usuario ya está vinculado a otro vendedor'
        });
      }
    }
    
    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    ).populate('userId', 'name email');
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...seller.toObject(),
        fullName: seller.fullName
      },
      message: 'Vendedor actualizado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar vendedor (soft delete)
// @route   DELETE /api/sellers/:id
// @access  Private/Admin
exports.deleteSeller = async (req, res, next) => {
  try {
    const seller = await Seller.findById(req.params.id);
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado'
      });
    }
    
    // Verificar si tiene ventas asociadas
    const hasSales = await Sale.countDocuments({ sellerId: seller._id });
    
    if (hasSales > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el vendedor porque tiene ${hasSales} ventas asociadas`
      });
    }
    
    // Soft delete
    seller.active = false;
    seller.terminationDate = new Date();
    await seller.save();
    
    res.status(200).json({
      success: true,
      message: 'Vendedor desactivado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener top vendedores
// @route   GET /api/sellers/top
// @access  Private
exports.getTopSellers = async (req, res, next) => {
  try {
    const { limit = 10, period = 'monthly' } = req.query;
    const topSellers = await Seller.getTopSellers(parseInt(limit), period);
    
    res.status(200).json({
      success: true,
      data: topSellers,
      period,
      limit: parseInt(limit)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener resumen de comisiones de un vendedor
// @route   GET /api/sellers/:id/commissions/summary
// @access  Private
exports.getCommissionSummary = async (req, res, next) => {
  try {
    const seller = await Seller.findById(req.params.id);
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado'
      });
    }
    
    // Calcular comisiones totales
    const totalEarned = seller.totalCommission;
    const pendingCommissions = seller.getPendingCommissions();
    const pendingAmount = pendingCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    
    // Obtener histórico de comisiones pagadas
    const paidHistory = seller.commissionHistory.filter(h => h.paid);
    const totalPaid = paidHistory.reduce((sum, h) => sum + h.commissionAmount, 0);
    
    // Calcular comisiones por período actual
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentPeriodCommission = seller.commissionHistory.find(h => h.period === currentPeriod);
    
    res.status(200).json({
      success: true,
      data: {
        sellerId: seller._id,
        sellerName: seller.fullName,
        totalSales: seller.totalSales,
        totalCommission: seller.totalCommission,
        totalPaid,
        pendingAmount,
        monthlySales: seller.monthlySales,
        salesCount: seller.salesCount,
        commissionRate: seller.commissionRate,
        commissionType: seller.commissionType,
        currentPeriodCommission: currentPeriodCommission || null,
        pendingCommissions: pendingCommissions.map(c => ({
          period: c.period,
          totalSales: c.totalSales,
          commissionAmount: c.commissionAmount,
          commissionRate: c.commissionRate
        })),
        commissionHistory: seller.commissionHistory
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calcular comisiones por período (todos los vendedores)
// @route   GET /api/sellers/commissions/calculate
// @access  Private/Admin
exports.calculateCommissions = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren startDate y endDate'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calcular comisiones usando el método estático del modelo
    const commissions = await Seller.calculateCommissionsForPeriod(start, end);
    
    res.status(200).json({
      success: true,
      data: {
        period: {
          startDate: start,
          endDate: end
        },
        commissions,
        totalCommissions: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
        totalSales: commissions.reduce((sum, c) => sum + c.totalSales, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Procesar pago de comisión
// @route   POST /api/sellers/:id/commissions/pay
// @access  Private/Admin
exports.payCommission = async (req, res, next) => {
  try {
    const { period, amount, paymentReference } = req.body;
    
    if (!period || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren period y amount'
      });
    }
    
    const seller = await Seller.findById(req.params.id);
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado'
      });
    }
    
    // Registrar el pago de comisión
    await seller.recordCommissionPayment(period, amount, paymentReference);
    
    res.status(200).json({
      success: true,
      data: {
        sellerId: seller._id,
        sellerName: seller.fullName,
        period,
        amount,
        paymentReference
      },
      message: 'Pago de comisión registrado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resetear métricas mensuales (todos los vendedores)
// @route   POST /api/sellers/reset-monthly-metrics
// @access  Private/Admin
exports.resetMonthlyMetrics = async (req, res, next) => {
  try {
    // Resetear monthlySales de todos los vendedores activos
    const result = await Seller.updateMany(
      { active: true },
      { monthlySales: 0 }
    );
    
    res.status(200).json({
      success: true,
      data: {
        updatedCount: result.modifiedCount
      },
      message: 'Métricas mensuales reiniciadas exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Estadísticas de vendedores
// @route   GET /api/sellers/stats
// @access  Private
exports.getSellerStats = async (req, res, next) => {
  try {
    const totalSellers = await Seller.countDocuments();
    const activeSellers = await Seller.countDocuments({ active: true });
    const inactiveSellers = totalSellers - activeSellers;
    
    // Distribución por puesto
    const positions = await Seller.aggregate([
      { $group: { _id: '$position', count: { $sum: 1 } } }
    ]);
    
    // Total de ventas acumulado
    const totalSalesAmount = await Seller.aggregate([
      { $group: { _id: null, total: { $sum: '$totalSales' } } }
    ]);
    
    // Total de comisiones acumuladas
    const totalCommissionsAmount = await Seller.aggregate([
      { $group: { _id: null, total: { $sum: '$totalCommission' } } }
    ]);
    
    // Tasa de comisión promedio
    const averageCommissionRate = await Seller.aggregate([
      { $match: { active: true } },
      { $group: { _id: null, average: { $avg: '$commissionRate' } } }
    ]);
    
    // Ventas del mes actual
    const currentMonthSales = await Seller.aggregate([
      { $group: { _id: null, total: { $sum: '$monthlySales' } } }
    ]);
    
    // Top vendedores por ventas totales (top 5)
    const topByTotalSales = await Seller.find({ active: true })
      .sort({ totalSales: -1 })
      .limit(5)
      .select('firstName lastName totalSales');
    
    res.status(200).json({
      success: true,
      data: {
        total: totalSellers,
        active: activeSellers,
        inactive: inactiveSellers,
        positions,
        totalSales: totalSalesAmount[0]?.total || 0,
        totalCommissions: totalCommissionsAmount[0]?.total || 0,
        averageCommissionRate: averageCommissionRate[0]?.average || 0,
        currentMonthSales: currentMonthSales[0]?.total || 0,
        topSellers: topByTotalSales
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener vendedor por usuario asociado
// @route   GET /api/sellers/user/:userId
// @access  Private
exports.getSellerByUserId = async (req, res, next) => {
  try {
    const seller = await Seller.findByUserId(req.params.userId)
      .populate('userId', 'name email');
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró un vendedor asociado a este usuario'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...seller.toObject(),
        fullName: seller.fullName
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activar/Desactivar vendedor (toggle)
// @route   PATCH /api/sellers/:id/toggle-status
// @access  Private/Admin
exports.toggleSellerStatus = async (req, res, next) => {
  try {
    const seller = await Seller.findById(req.params.id);
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado'
      });
    }
    
    seller.active = !seller.active;
    
    if (!seller.active) {
      seller.terminationDate = new Date();
    } else {
      seller.terminationDate = null;
    }
    
    await seller.save();
    
    res.status(200).json({
      success: true,
      data: {
        active: seller.active,
        terminationDate: seller.terminationDate
      },
      message: `Vendedor ${seller.active ? 'activado' : 'desactivado'} exitosamente`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Agregar turno de trabajo a vendedor
// @route   POST /api/sellers/:id/shifts
// @access  Private/Admin
exports.addShift = async (req, res, next) => {
  try {
    const { day, startTime, endTime, active } = req.body;
    
    if (!day || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren day, startTime y endTime'
      });
    }
    
    const seller = await Seller.findById(req.params.id);
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado'
      });
    }
    
    seller.shifts.push({
      day,
      startTime,
      endTime,
      active: active !== false
    });
    
    await seller.save();
    
    res.status(201).json({
      success: true,
      data: seller.shifts,
      message: 'Turno agregado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar turno de trabajo
// @route   DELETE /api/sellers/:id/shifts/:shiftId
// @access  Private/Admin
exports.removeShift = async (req, res, next) => {
  try {
    const { id, shiftId } = req.params;
    
    const seller = await Seller.findById(id);
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado'
      });
    }
    
    // Eliminar el turno
    seller.shifts = seller.shifts.filter(shift => shift._id.toString() !== shiftId);
    await seller.save();
    
    res.status(200).json({
      success: true,
      data: seller.shifts,
      message: 'Turno eliminado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};