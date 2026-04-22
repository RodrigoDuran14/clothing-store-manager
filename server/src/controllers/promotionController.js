const Promotion = require('../models/Promotion');
const promotionService = require('../services/promotionService');
const { filterObj, paginate, formatPagination } = require('../utils/helpers');

// @desc    Obtener todas las promociones
// @route   GET /api/promotions
// @access  Private
exports.getPromotions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      isActive,
      type,
      search,
      orderBy = 'createdAt_desc'
    } = req.query;
    
    // Construir filtro
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (type) filter.type = type;
    
    // Búsqueda por nombre o código
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Configurar ordenamiento
    let sort = {};
    switch(orderBy) {
      case 'createdAt_asc':
        sort = { createdAt: 1 };
        break;
      case 'createdAt_desc':
        sort = { createdAt: -1 };
        break;
      case 'priority':
        sort = { priority: -1 };
        break;
      case 'startDate':
        sort = { startDate: 1 };
        break;
      case 'endDate':
        sort = { endDate: 1 };
        break;
      default:
        sort = { createdAt: -1 };
    }
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    const promotions = await Promotion.find(filter)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitValue);
    
    // Agregar información virtual
    const promotionsWithVirtuals = promotions.map(promo => ({
      ...promo.toObject(),
      isCurrentlyActive: promo.isCurrentlyActive,
      daysRemaining: promo.daysRemaining,
      usagePercentage: promo.usagePercentage
    }));
    
    const total = await Promotion.countDocuments(filter);
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: promotionsWithVirtuals,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener promoción por ID
// @route   GET /api/promotions/:id
// @access  Private
exports.getPromotionById = async (req, res, next) => {
  try {
    const promotion = await Promotion.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...promotion.toObject(),
        isCurrentlyActive: promotion.isCurrentlyActive,
        daysRemaining: promotion.daysRemaining
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener promoción por código
// @route   GET /api/promotions/code/:code
// @access  Private
exports.getPromotionByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    
    const promotion = await Promotion.findOne({ code: code.toUpperCase() });
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...promotion.toObject(),
        isCurrentlyActive: promotion.isCurrentlyActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear promoción
// @route   POST /api/promotions
// @access  Private/Admin
exports.createPromotion = async (req, res, next) => {
  try {
    const {
      name,
      description,
      code,
      type,
      conditions,
      benefits,
      applicableProducts,
      applicableCategories,
      applicableSizes,
      applicableColors,
      minPurchaseAmount,
      maxDiscountAmount,
      usageLimit,
      usageLimitPerCustomer,
      startDate,
      endDate,
      priority,
      stackable
    } = req.body;
    
    // Verificar si ya existe una promoción con el mismo nombre
    const existingPromotion = await Promotion.findOne({ name });
    if (existingPromotion) {
      return res.status(400).json({
        success: false,
        message: 'A promotion with this name already exists'
      });
    }
    
    // Verificar código único si se proporcionó
    if (code) {
      const existingCode = await Promotion.findOne({ code: code.toUpperCase() });
      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: 'A promotion with this code already exists'
        });
      }
    }
    
    const promotion = await Promotion.create({
      name,
      description,
      code: code ? code.toUpperCase() : undefined,
      type: type || 'automatic',
      conditions: conditions || [],
      benefits,
      applicableProducts: applicableProducts || { includeAll: false },
      applicableCategories: applicableCategories || { includeAll: false },
      applicableSizes: applicableSizes || [],
      applicableColors: applicableColors || [],
      minPurchaseAmount: minPurchaseAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      usageLimit: usageLimit || null,
      usageLimitPerCustomer: usageLimitPerCustomer || null,
      startDate,
      endDate,
      priority: priority || 0,
      stackable: stackable || false,
      createdBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: promotion,
      message: 'Promotion created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar promoción
// @route   PUT /api/promotions/:id
// @access  Private/Admin
exports.updatePromotion = async (req, res, next) => {
  try {
    const allowedFields = [
      'name', 'description', 'code', 'type', 'conditions', 'benefits',
      'applicableProducts', 'applicableCategories', 'applicableSizes',
      'applicableColors', 'minPurchaseAmount', 'maxDiscountAmount',
      'usageLimit', 'usageLimitPerCustomer', 'startDate', 'endDate',
      'isActive', 'priority', 'stackable'
    ];
    
    const filteredBody = filterObj(req.body, ...allowedFields);
    
    // Verificar nombre único
    if (filteredBody.name) {
      const existingPromotion = await Promotion.findOne({
        name: filteredBody.name,
        _id: { $ne: req.params.id }
      });
      
      if (existingPromotion) {
        return res.status(400).json({
          success: false,
          message: 'Another promotion with this name already exists'
        });
      }
    }
    
    // Verificar código único
    if (filteredBody.code) {
      filteredBody.code = filteredBody.code.toUpperCase();
      const existingCode = await Promotion.findOne({
        code: filteredBody.code,
        _id: { $ne: req.params.id }
      });
      
      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: 'Another promotion with this code already exists'
        });
      }
    }
    
    filteredBody.updatedBy = req.user.id;
    
    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: promotion,
      message: 'Promotion updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar promoción
// @route   DELETE /api/promotions/:id
// @access  Private/Admin
exports.deletePromotion = async (req, res, next) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }
    
    await promotion.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Promotion deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activar/Desactivar promoción
// @route   PATCH /api/promotions/:id/toggle-status
// @access  Private/Admin
exports.togglePromotionStatus = async (req, res, next) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promotion not found'
      });
    }
    
    promotion.isActive = !promotion.isActive;
    promotion.updatedBy = req.user.id;
    await promotion.save();
    
    res.status(200).json({
      success: true,
      data: { isActive: promotion.isActive },
      message: `Promotion ${promotion.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validar código de promoción
// @route   POST /api/promotions/validate
// @access  Private
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, clientId, purchaseAmount } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }
    
    const result = await promotionService.validateCoupon(
      code,
      clientId,
      purchaseAmount || 0
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener promociones activas
// @route   GET /api/promotions/active
// @access  Private
exports.getActivePromotions = async (req, res, next) => {
  try {
    const promotions = await Promotion.getActivePromotions();
    
    res.status(200).json({
      success: true,
      data: promotions,
      total: promotions.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener promociones destacadas
// @route   GET /api/promotions/featured
// @access  Private
exports.getFeaturedPromotions = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;
    const promotions = await promotionService.getFeaturedPromotions(parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: promotions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener promociones aplicables a un producto
// @route   GET /api/promotions/product/:productId
// @access  Private
exports.getProductPromotions = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { size, color } = req.query;
    
    const promotions = await promotionService.getProductPromotions(
      productId,
      size,
      color
    );
    
    res.status(200).json({
      success: true,
      data: promotions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Estadísticas de promociones
// @route   GET /api/promotions/stats
// @access  Private
exports.getPromotionStats = async (req, res, next) => {
  try {
    const totalPromotions = await Promotion.countDocuments();
    const activePromotions = await Promotion.countDocuments({ isActive: true });
    const inactivePromotions = totalPromotions - activePromotions;
    
    const now = new Date();
    const currentlyActive = await Promotion.countDocuments({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    });
    
    const promotionsByType = await Promotion.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    const mostUsedPromotions = await Promotion.find({ usedCount: { $gt: 0 } })
      .sort({ usedCount: -1 })
      .limit(5)
      .select('name code usedCount usageLimit');
    
    const expiringSoon = await Promotion.find({
      isActive: true,
      endDate: { $gte: now, $lte: new Date(now.setDate(now.getDate() + 7)) }
    }).select('name endDate');
    
    res.status(200).json({
      success: true,
      data: {
        total: totalPromotions,
        active: activePromotions,
        inactive: inactivePromotions,
        currentlyActive,
        byType: promotionsByType,
        mostUsed: mostUsedPromotions,
        expiringSoon
      }
    });
  } catch (error) {
    next(error);
  }
};