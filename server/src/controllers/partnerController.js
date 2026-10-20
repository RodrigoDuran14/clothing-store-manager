const Partner = require("../models/Partner");
const PartnerCashRegister = require("../models/PartnerCashRegister");
const Category = require("../models/Category");
const Product = require("../models/Product");
const partnerSplitService = require("../services/partnerSplitService");
const { filterObj, paginate, formatPagination } = require("../utils/helpers");
const auditService = require('../services/auditService'); 

// @desc    Obtener todos los socios
// @route   GET /api/partners
// @access  Private/Admin
exports.getPartners = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const {
      skip,
      limit: limitValue,
      page: currentPage,
    } = paginate(page, limit);

    const partners = await Partner.find(filter)
      .populate("ownedCategories", "name")
      .populate("bankAccounts", "bankName accountNumber balance")
      .populate("cashRegisterId")
      .skip(skip)
      .limit(limitValue);

    const total = await Partner.countDocuments(filter);
    const pagination = formatPagination(total, currentPage, limitValue);

    res.status(200).json({
      success: true,
      data: partners,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener socio por ID
// @route   GET /api/partners/:id
// @access  Private/Admin
exports.getPartnerById = async (req, res, next) => {
  try {
    const partner = await Partner.findById(req.params.id)
      .populate("ownedCategories", "name description")
      .populate("ownedProducts", "name price")
      .populate("bankAccounts", "bankName accountNumber balance")
      .populate("cashRegisterId")
      .populate("userId", "name email");

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    res.status(200).json({
      success: true,
      data: partner,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear socio
// @route   POST /api/partners
// @access  Private/Admin
exports.createPartner = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      document,
      ownershipPercentage,
      ownedCategories,
      ownedProducts,
      bankAccounts,
      userId,
      notes,
    } = req.body;

    // Verificar email único
    const existingPartner = await Partner.findOne({ email });
    if (existingPartner) {
      return res.status(400).json({
        success: false,
        message: "A partner with this email already exists",
      });
    }

    // Crear socio
    const partner = await Partner.create({
      name,
      email,
      phone,
      document,
      ownershipPercentage: ownershipPercentage || 50,
      ownedCategories: ownedCategories || [],
      ownedProducts: ownedProducts || [],
      bankAccounts: bankAccounts || [],
      userId,
      notes,
    });

    // Crear caja para el socio
    const cashRegister = await PartnerCashRegister.create({
      partnerId: partner._id,
      balance: 0,
      initialBalance: 0,
      isOpen: true,
    });

    partner.cashRegisterId = cashRegister._id;
    await partner.save();

    res.status(201).json({
      success: true,
      data: {
        partner,
        cashRegister,
      },
      message: "Partner created successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar socio
// @route   PUT /api/partners/:id
// @access  Private/Admin
exports.updatePartner = async (req, res, next) => {
  try {
    const allowedFields = [
      "name",
      "email",
      "phone",
      "document",
      "ownershipPercentage",
      "ownedCategories",
      "ownedProducts",
      "bankAccounts",
      "userId",
      "notes",
      "isActive",
    ];

    const filteredBody = filterObj(req.body, ...allowedFields);

    // Verificar email único si se está actualizando
    if (filteredBody.email) {
      const existingPartner = await Partner.findOne({
        email: filteredBody.email,
        _id: { $ne: req.params.id },
      });
      if (existingPartner) {
        return res.status(400).json({
          success: false,
          message: "Another partner with this email already exists",
        });
      }
    }

    // Verificar documento único si se está actualizando
    if (filteredBody.document) {
      const existingPartner = await Partner.findOne({
        document: filteredBody.document,
        _id: { $ne: req.params.id },
      });
      if (existingPartner) {
        return res.status(400).json({
          success: false,
          message: "Another partner with this document already exists",
        });
      }
    }

    // Si se actualiza userId, verificar que el usuario exista y no esté asignado a otro socio
    if (filteredBody.userId) {
      const User = require("../models/User");
      const user = await User.findById(filteredBody.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const existingPartner = await Partner.findOne({
        userId: filteredBody.userId,
        _id: { $ne: req.params.id },
      });
      if (existingPartner) {
        return res.status(400).json({
          success: false,
          message: "This user is already assigned to another partner",
        });
      }
    }

    // Si se actualizan categorías o productos, podrías verificar que existan (opcional)
    // Aquí solo actualizamos

    const partner = await Partner.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("ownedCategories", "name")
      .populate("ownedProducts", "name price")
      .populate("bankAccounts", "bankName accountNumber balance")
      .populate("cashRegisterId")
      .populate("userId", "name email");

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    res.status(200).json({
      success: true,
      data: partner,
      message: "Partner updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activar/Desactivar socio (toggle status)
// @route   PATCH /api/partners/:id/toggle-status
// @access  Private/Admin
exports.togglePartnerStatus = async (req, res, next) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    // Cambiar estado
    partner.isActive = !partner.isActive;
    await partner.save();

    // Opcional: si se desactiva, también se puede cerrar su caja
    if (!partner.isActive) {
      const cashRegister = await PartnerCashRegister.findOne({
        partnerId: partner._id,
      });
      if (cashRegister && cashRegister.isOpen) {
        // Cerrar la caja asociada (sin requerir usuario específico)
        cashRegister.isOpen = false;
        cashRegister.closedAt = new Date();
        cashRegister.closedBy = req.user.id;
        await cashRegister.save();
      }
    }

    await auditService.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: "admin",
      action: "TOGGLE_STATUS",
      entity: "Partner",
      entityId: partner._id,
      oldData: { isActive: !partner.isActive },
      newData: { isActive: partner.isActive },
      req,
    });

    res.status(200).json({
      success: true,
      data: {
        _id: partner._id,
        name: partner.name,
        isActive: partner.isActive,
      },
      message: `Partner ${partner.isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener resumen de ingresos por socio
// @route   GET /api/partners/:id/income-summary
// @access  Private/Admin
exports.getPartnerIncomeSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required",
      });
    }

    const summary = await partnerSplitService.getPartnerIncomeSummary(
      new Date(startDate),
      new Date(endDate),
    );

    // Filtrar por socio específico si se pide
    const partnerSummary = summary.find(
      (s) => s.partnerId.toString() === req.params.id,
    );

    res.status(200).json({
      success: true,
      data: partnerSummary || null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener balance general entre socios
// @route   GET /api/partners/balances
// @access  Private/Admin
exports.getPartnerBalances = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const balances = await partnerSplitService.calculatePartnerBalances(
      startDate
        ? new Date(startDate)
        : new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate ? new Date(endDate) : new Date(),
    );

    res.status(200).json({
      success: true,
      data: balances,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener caja del socio autenticado
// @route   GET /api/partners/my-cash-register
// @access  Private
exports.getMyCashRegister = async (req, res, next) => {
  try {
    const partner = await Partner.findOne({ userId: req.user.id });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "No partner associated with this user",
      });
    }

    const cashRegister = await PartnerCashRegister.findOne({
      partnerId: partner._id,
    }).populate("partnerId", "name");

    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        message: "Cash register not found",
      });
    }

    res.status(200).json({
      success: true,
      data: cashRegister,
    });
  } catch (error) {
    next(error);
  }
};
