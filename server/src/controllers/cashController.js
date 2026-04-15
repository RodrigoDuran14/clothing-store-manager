const PartnerCashRegister = require('../models/PartnerCashRegister');
const Partner = require('../models/Partner');
const cashService = require('../services/cashService');
const { paginate, formatPagination } = require('../utils/helpers');

// @desc    Abrir caja del socio
// @route   POST /api/cash/open
// @access  Private
exports.openCashRegister = async (req, res, next) => {
  try {
    const { initialBalance } = req.body;
    
    const partner = await Partner.findOne({ userId: req.user.id });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'No partner associated with this user'
      });
    }
    
    let cashRegister = await PartnerCashRegister.findOne({ partnerId: partner._id });
    
    if (!cashRegister) {
      cashRegister = new PartnerCashRegister({
        partnerId: partner._id,
        balance: 0,
        initialBalance: 0,
        isOpen: false
      });
    }
    
    if (cashRegister.isOpen) {
      return res.status(400).json({
        success: false,
        message: 'Cash register is already open'
      });
    }
    
    await cashRegister.open(req.user.id, initialBalance || 0);
    
    res.status(200).json({
      success: true,
      data: cashRegister,
      message: 'Cash register opened successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cerrar caja del socio
// @route   POST /api/cash/close
// @access  Private
exports.closeCashRegister = async (req, res, next) => {
  try {
    const partner = await Partner.findOne({ userId: req.user.id });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'No partner associated with this user'
      });
    }
    
    const cashRegister = await PartnerCashRegister.findOne({ partnerId: partner._id });
    
    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        message: 'Cash register not found'
      });
    }
    
    if (!cashRegister.isOpen) {
      return res.status(400).json({
        success: false,
        message: 'Cash register is already closed'
      });
    }
    
    const result = await cashService.closeCashRegister(cashRegister._id, req.user.id);
    
    res.status(200).json({
      success: true,
      data: result,
      message: 'Cash register closed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Registrar gasto
// @route   POST /api/cash/expense
// @access  Private
exports.registerExpense = async (req, res, next) => {
  try {
    const { category, amount, description, paymentMethod, receiptNumber, notes } = req.body;
    
    const partner = await Partner.findOne({ userId: req.user.id });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'No partner associated with this user'
      });
    }
    
    const result = await cashService.registerExpense({
      partnerId: partner._id,
      category,
      amount,
      description,
      paymentMethod,
      receiptNumber,
      notes
    }, req.user.id);
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Expense registered successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Retirar efectivo
// @route   POST /api/cash/withdraw
// @access  Private
exports.withdrawCash = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    
    const partner = await Partner.findOne({ userId: req.user.id });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'No partner associated with this user'
      });
    }
    
    const cashRegister = await PartnerCashRegister.findOne({ partnerId: partner._id });
    
    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        message: 'Cash register not found'
      });
    }
    
    const movement = await cashService.withdrawCash(cashRegister._id, amount, reason, req.user.id);
    
    res.status(200).json({
      success: true,
      data: movement,
      message: 'Withdrawal completed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Depositar efectivo
// @route   POST /api/cash/deposit
// @access  Private
exports.depositCash = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    
    const partner = await Partner.findOne({ userId: req.user.id });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'No partner associated with this user'
      });
    }
    
    const cashRegister = await PartnerCashRegister.findOne({ partnerId: partner._id });
    
    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        message: 'Cash register not found'
      });
    }
    
    const movement = await cashService.depositCash(cashRegister._id, amount, reason, req.user.id);
    
    res.status(200).json({
      success: true,
      data: movement,
      message: 'Deposit completed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ajustar caja
// @route   POST /api/cash/adjust
// @access  Private/Admin
exports.adjustCash = async (req, res, next) => {
  try {
    const { cashRegisterId, type, amount, reason } = req.body;
    
    const result = await cashService.adjustCash(cashRegisterId, type, amount, reason, req.user.id);
    
    res.status(200).json({
      success: true,
      data: result,
      message: 'Cash adjusted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener reporte de caja
// @route   GET /api/cash/report
// @access  Private
exports.getCashReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const partner = await Partner.findOne({ userId: req.user.id });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'No partner associated with this user'
      });
    }
    
    const report = await cashService.getCashReport(
      partner._id,
      new Date(startDate),
      new Date(endDate)
    );
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener movimientos de caja
// @route   GET /api/cash/movements
// @access  Private
exports.getCashMovements = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;
    
    const partner = await Partner.findOne({ userId: req.user.id });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'No partner associated with this user'
      });
    }
    
    const cashRegister = await PartnerCashRegister.findOne({ partnerId: partner._id });
    
    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        message: 'Cash register not found'
      });
    }
    
    let movements = [...cashRegister.movements];
    
    if (type) {
      movements = movements.filter(m => m.type === type);
    }
    
    if (startDate) {
      movements = movements.filter(m => new Date(m.date) >= new Date(startDate));
    }
    
    if (endDate) {
      movements = movements.filter(m => new Date(m.date) <= new Date(endDate));
    }
    
    movements.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    const paginatedMovements = movements.slice(skip, skip + limitValue);
    const total = movements.length;
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: paginatedMovements,
      pagination,
      balance: cashRegister.balance,
      isOpen: cashRegister.isOpen
    });
  } catch (error) {
    next(error);
  }
};