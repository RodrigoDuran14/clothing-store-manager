const Partner = require('../models/Partner');
const PartnerCashRegister = require('../models/PartnerCashRegister');
const Expense = require('../models/Expense');
const cashService = require('../services/cashService');
const { paginate, formatPagination } = require('../utils/helpers');

// ============================================
// APERTURA Y CIERRE DE CAJA
// ============================================

// @desc    Abrir caja
// @route   POST /api/cash/open
// @access  Private
exports.openCashRegister = async (req, res, next) => {
  try {
    const { initialBalance, cashierName } = req.body;
    
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
    
    if (cashierName) {
      cashRegister.cashierName = cashierName;
      cashRegister.openingCashierId = req.user.id;
      await cashRegister.save();
    }
    
    res.status(200).json({
      success: true,
      data: cashRegister,
      message: 'Cash register opened successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cerrar caja (cierre simple, sin conteo detallado)
// @route   POST /api/cash/close
// @access  Private
exports.closeCashRegister = async (req, res, next) => {
  try {
    const { closingBalance, notes } = req.body;
    
    if (closingBalance === undefined || closingBalance === null) {
      return res.status(400).json({
        success: false,
        message: 'Closing balance is required'
      });
    }
    
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
    
    const result = await cashService.performCashClosure(
      cashRegister._id,
      parseFloat(closingBalance),
      req.user.id,
      notes
    );
    
    const message = result.closure.difference !== 0
      ? `Cash closed with difference of $${Math.abs(result.closure.difference).toLocaleString('es-AR')}. Review required.`
      : 'Cash closed successfully with no differences';
    
    res.status(200).json({
      success: true,
      data: result,
      message
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// GASTOS
// ============================================

// @desc    Registrar gasto
// @route   POST /api/cash/expense
// @access  Private
exports.registerExpense = async (req, res, next) => {
  try {
    const { category, amount, description, paymentMethod, receiptNumber, notes } = req.body;
    
    if (!category || !amount || !description) {
      return res.status(400).json({
        success: false,
        message: 'Category, amount and description are required'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }
    
    const partner = await Partner.findOne({ userId: req.user.id });
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'No partner associated with this user'
      });
    }
    
    const cashRegister = await PartnerCashRegister.findOne({ 
      partnerId: partner._id,
      isOpen: true 
    });
    
    if (!cashRegister) {
      return res.status(400).json({
        success: false,
        message: 'Cash register is not open'
      });
    }
    
    // Verificar saldo suficiente si es gasto en efectivo
    if (paymentMethod === 'cash' && cashRegister.balance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient funds. Available balance: $${cashRegister.balance.toLocaleString('es-AR')}`
      });
    }
    
    // Crear gasto
    const expense = await Expense.create({
      partnerId: partner._id,
      category,
      amount,
      description,
      paymentMethod: paymentMethod || 'cash',
      receiptNumber,
      notes,
      date: new Date(),
      createdBy: req.user.id
    });
    
    // Registrar movimiento en caja solo si es pago en efectivo
    let movement = null;
    if (paymentMethod === 'cash') {
      movement = await cashRegister.addMovement(
        'expense',
        amount,
        `Expense: ${description}`,
        expense._id,
        'Expense',
        req.user.id
      );
      
      expense.registeredInCash = true;
      expense.registeredAt = new Date();
      await expense.save();
    }
    
    res.status(201).json({
      success: true,
      data: { expense, movement },
      message: 'Expense registered successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// RETIROS Y DEPÓSITOS
// ============================================

// @desc    Retirar efectivo de caja
// @route   POST /api/cash/withdraw
// @access  Private
exports.withdrawCash = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required'
      });
    }
    
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
        message: 'Cash register is closed'
      });
    }
    
    if (cashRegister.balance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient funds. Available balance: $${cashRegister.balance.toLocaleString('es-AR')}`
      });
    }
    
    const movement = await cashRegister.addMovement(
      'withdrawal',
      amount,
      `Withdrawal: ${reason}`,
      null,
      null,
      req.user.id
    );
    
    res.status(200).json({
      success: true,
      data: movement,
      message: `Withdrawal of $${amount.toLocaleString('es-AR')} completed successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Depositar efectivo en caja
// @route   POST /api/cash/deposit
// @access  Private
exports.depositCash = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required'
      });
    }
    
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
        message: 'Cash register is closed'
      });
    }
    
    const movement = await cashRegister.addMovement(
      'deposit',
      amount,
      `Deposit: ${reason}`,
      null,
      null,
      req.user.id
    );
    
    res.status(200).json({
      success: true,
      data: movement,
      message: `Deposit of $${amount.toLocaleString('es-AR')} completed successfully`
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// REPORTES Y MOVIMIENTOS
// ============================================

// @desc    Reporte de caja (resumen por período)
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
    
    const report = await cashService.getDailyCashReport(
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

// @desc    Movimientos de caja (listado paginado)
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
    
    // Filtrar por tipo
    if (type) {
      movements = movements.filter(m => m.type === type);
    }
    
    // Filtrar por fecha
    if (startDate) {
      movements = movements.filter(m => new Date(m.date) >= new Date(startDate));
    }
    if (endDate) {
      movements = movements.filter(m => new Date(m.date) <= new Date(endDate));
    }
    
    // Ordenar por fecha descendente (más reciente primero)
    movements.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Paginación
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    const paginatedMovements = movements.slice(skip, skip + limitValue);
    const total = movements.length;
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: {
        movements: paginatedMovements,
        pagination,
        balance: cashRegister.balance,
        isOpen: cashRegister.isOpen
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// PREPARAR Y REALIZAR CIERRE (con vista previa)
// ============================================

// @desc    Preparar cierre de caja (vista previa)
// @route   GET /api/cash/prepare-closure
// @access  Private
exports.prepareClosure = async (req, res, next) => {
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
    
    const closureData = await cashService.prepareCashClosure(cashRegister._id);
    
    res.status(200).json({
      success: true,
      data: closureData
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ARQUEO Y AUDITORÍA
// ============================================

// @desc    Obtener arqueo de caja
// @route   GET /api/cash/audit
// @access  Private
exports.getCashAudit = async (req, res, next) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }
    
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
    
    const audit = await cashService.getCashAudit(cashRegister._id, new Date(date));
    
    res.status(200).json({
      success: true,
      data: audit
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reporte diario de caja por período
// @route   GET /api/cash/daily-report
// @access  Private
exports.getDailyCashReport = async (req, res, next) => {
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
    
    const report = await cashService.getDailyCashReport(
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

// ============================================
// OPERACIONES DE ADMIN
// ============================================

// @desc    Ajustar caja (admin) - para corregir diferencias
// @route   POST /api/cash/adjust
// @access  Private/Admin
exports.adjustCash = async (req, res, next) => {
  try {
    const { cashRegisterId, type, amount, reason } = req.body;
    
    if (!cashRegisterId || !type || !amount || !reason) {
      return res.status(400).json({
        success: false,
        message: 'cashRegisterId, type, amount and reason are required'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }
    
    if (!['surplus', 'shortage'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be "surplus" or "shortage"'
      });
    }
    
    const cashRegister = await PartnerCashRegister.findById(cashRegisterId);
    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        message: 'Cash register not found'
      });
    }
    
    const previousBalance = cashRegister.balance;
    let newBalance = previousBalance;
    
    if (type === 'surplus') {
      newBalance = previousBalance + amount;
    } else if (type === 'shortage') {
      if (previousBalance < amount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient funds for shortage adjustment. Balance: $${previousBalance}`
        });
      }
      newBalance = previousBalance - amount;
    }
    
    // Registrar ajuste
    const adjustment = await cashRegister.addMovement(
      'adjustment',
      type === 'surplus' ? amount : -amount,
      `Adjustment: ${reason}`,
      null,
      null,
      req.user.id
    );
    
    res.status(200).json({
      success: true,
      data: {
        adjustment,
        previousBalance,
        newBalance: cashRegister.balance,
        type,
        amount,
        reason
      },
      message: `Cash adjusted successfully: ${type === 'surplus' ? 'added' : 'removed'} $${amount.toLocaleString('es-AR')}`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener reporte de diferencias (admin)
// @route   GET /api/cash/discrepancies
// @access  Private/Admin
exports.getDiscrepancies = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const discrepancies = await cashService.getDiscrepancyReport(
      new Date(startDate),
      new Date(endDate)
    );
    
    res.status(200).json({
      success: true,
      data: discrepancies
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolver discrepancia (admin)
// @route   PUT /api/cash/discrepancies/:id/resolve
// @access  Private/Admin
exports.resolveDiscrepancy = async (req, res, next) => {
  try {
    const { notes } = req.body;
    
    const closure = await cashService.resolveDiscrepancy(
      req.params.id,
      notes,
      req.user.id
    );
    
    res.status(200).json({
      success: true,
      data: closure,
      message: 'Discrepancy resolved successfully'
    });
  } catch (error) {
    next(error);
  }
};