const Partner = require('../models/Partner');
const PartnerCashRegister = require('../models/PartnerCashRegister');
const Category = require('../models/Category');
const Product = require('../models/Product');
const partnerSplitService = require('../services/partnerSplitService');
const { filterObj, paginate, formatPagination } = require('../utils/helpers');

// @desc    Obtener todos los socios
// @route   GET /api/partners
// @access  Private/Admin
exports.getPartners = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    const partners = await Partner.find(filter)
      .populate('ownedCategories', 'name')
      .populate('bankAccounts', 'bankName accountNumber balance')
      .populate('cashRegisterId')
      .skip(skip)
      .limit(limitValue);
    
    const total = await Partner.countDocuments(filter);
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: partners,
      pagination
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
      .populate('ownedCategories', 'name description')
      .populate('ownedProducts', 'name price')
      .populate('bankAccounts', 'bankName accountNumber balance')
      .populate('cashRegisterId')
      .populate('userId', 'name email');
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: partner
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
      notes
    } = req.body;
    
    // Verificar email único
    const existingPartner = await Partner.findOne({ email });
    if (existingPartner) {
      return res.status(400).json({
        success: false,
        message: 'A partner with this email already exists'
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
      notes
    });
    
    // Crear caja para el socio
    const cashRegister = await PartnerCashRegister.create({
      partnerId: partner._id,
      balance: 0,
      initialBalance: 0,
      isOpen: true
    });
    
    partner.cashRegisterId = cashRegister._id;
    await partner.save();
    
    res.status(201).json({
      success: true,
      data: {
        partner,
        cashRegister
      },
      message: 'Partner created successfully'
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
        message: 'startDate and endDate are required'
      });
    }
    
    const summary = await partnerSplitService.getPartnerIncomeSummary(
      new Date(startDate),
      new Date(endDate)
    );
    
    // Filtrar por socio específico si se pide
    const partnerSummary = summary.find(s => s.partnerId.toString() === req.params.id);
    
    res.status(200).json({
      success: true,
      data: partnerSummary || null
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
      startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1)),
      endDate ? new Date(endDate) : new Date()
    );
    
    res.status(200).json({
      success: true,
      data: balances
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
        message: 'No partner associated with this user'
      });
    }
    
    const cashRegister = await PartnerCashRegister.findOne({ partnerId: partner._id })
      .populate('partnerId', 'name');
    
    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        message: 'Cash register not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: cashRegister
    });
  } catch (error) {
    next(error);
  }
};