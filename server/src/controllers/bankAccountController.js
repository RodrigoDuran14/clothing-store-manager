const BankAccount = require('../models/BankAccount');
const bankService = require('../services/bankService');
const { filterObj, paginate, formatPagination } = require('../utils/helpers');

// @desc    Obtener todas las cuentas bancarias
// @route   GET /api/bank-accounts
// @access  Private
exports.getBankAccounts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      isActive,
      accountType,
      currency,
      search,
      orderBy = 'createdAt_desc'
    } = req.query;
    
    // Construir filtro
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (accountType) filter.accountType = accountType;
    if (currency) filter.currency = currency;
    
    // Búsqueda por nombre de banco, número de cuenta, CBU o alias
    if (search) {
      filter.$or = [
        { bankName: { $regex: search, $options: 'i' } },
        { accountNumber: { $regex: search, $options: 'i' } },
        { cbu: { $regex: search, $options: 'i' } },
        { alias: { $regex: search, $options: 'i' } }
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
      case 'bankName':
        sort = { bankName: 1 };
        break;
      case 'balance':
        sort = { balance: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    const accounts = await BankAccount.find(filter)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitValue);
    
    const total = await BankAccount.countDocuments(filter);
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: accounts,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener cuenta bancaria por ID
// @route   GET /api/bank-accounts/:id
// @access  Private
exports.getBankAccountById = async (req, res, next) => {
  try {
    const account = await BankAccount.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('movements.reconciledBy', 'name email')
      .populate('movements.createdBy', 'name email');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...account.toObject(),
        fullName: account.fullName,
        reconciledBalance: account.reconciledBalance
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener cuenta por defecto
// @route   GET /api/bank-accounts/default
// @access  Private
exports.getDefaultAccount = async (req, res, next) => {
  try {
    const defaultAccount = await BankAccount.getDefaultAccount();
    
    if (!defaultAccount) {
      return res.status(404).json({
        success: false,
        message: 'No active bank account found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: defaultAccount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear cuenta bancaria
// @route   POST /api/bank-accounts
// @access  Private/Admin
exports.createBankAccount = async (req, res, next) => {
  try {
    const {
      bankName,
      accountType,
      accountNumber,
      cbu,
      alias,
      currency,
      initialBalance,
      isDefault,
      businessName,
      taxId,
      notes
    } = req.body;
    
    // Verificar si ya existe cuenta con mismo número
    const existingAccount = await BankAccount.findOne({ accountNumber });
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'An account with this number already exists'
      });
    }
    
    // Verificar CBU único
    if (cbu) {
      const existingCbu = await BankAccount.findOne({ cbu });
      if (existingCbu) {
        return res.status(400).json({
          success: false,
          message: 'An account with this CBU already exists'
        });
      }
    }
    
    // Verificar alias único
    if (alias) {
      const existingAlias = await BankAccount.findOne({ alias });
      if (existingAlias) {
        return res.status(400).json({
          success: false,
          message: 'An account with this alias already exists'
        });
      }
    }
    
    const account = await BankAccount.create({
      bankName,
      accountType: accountType || 'checking',
      accountNumber,
      cbu,
      alias,
      currency: currency || 'ARS',
      initialBalance: initialBalance || 0,
      balance: initialBalance || 0,
      isDefault: isDefault || false,
      businessName,
      taxId,
      notes,
      createdBy: req.user.id
    });
    
    // Si tiene saldo inicial, registrar movimiento
    if (initialBalance && initialBalance > 0) {
      await account.addMovement(
        'adjustment',
        initialBalance,
        'Initial balance',
        null,
        null,
        null,
        req.user.id
      );
    }
    
    res.status(201).json({
      success: true,
      data: account,
      message: 'Bank account created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar cuenta bancaria
// @route   PUT /api/bank-accounts/:id
// @access  Private/Admin
exports.updateBankAccount = async (req, res, next) => {
  try {
    const allowedFields = [
      'bankName', 'accountType', 'accountNumber', 'cbu', 'alias',
      'currency', 'isActive', 'isDefault', 'businessName', 'taxId', 'notes'
    ];
    
    const filteredBody = filterObj(req.body, ...allowedFields);
    
    // Verificar número de cuenta único
    if (filteredBody.accountNumber) {
      const existingAccount = await BankAccount.findOne({
        accountNumber: filteredBody.accountNumber,
        _id: { $ne: req.params.id }
      });
      
      if (existingAccount) {
        return res.status(400).json({
          success: false,
          message: 'Another account with this number already exists'
        });
      }
    }
    
    // Verificar CBU único
    if (filteredBody.cbu) {
      const existingCbu = await BankAccount.findOne({
        cbu: filteredBody.cbu,
        _id: { $ne: req.params.id }
      });
      
      if (existingCbu) {
        return res.status(400).json({
          success: false,
          message: 'Another account with this CBU already exists'
        });
      }
    }
    
    // Verificar alias único
    if (filteredBody.alias) {
      const existingAlias = await BankAccount.findOne({
        alias: filteredBody.alias,
        _id: { $ne: req.params.id }
      });
      
      if (existingAlias) {
        return res.status(400).json({
          success: false,
          message: 'Another account with this alias already exists'
        });
      }
    }
    
    filteredBody.updatedBy = req.user.id;
    
    const account = await BankAccount.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: account,
      message: 'Bank account updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar cuenta bancaria
// @route   DELETE /api/bank-accounts/:id
// @access  Private/Admin
exports.deleteBankAccount = async (req, res, next) => {
  try {
    const account = await BankAccount.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }
    
    // Verificar si tiene movimientos asociados
    if (account.movements.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete account with existing movements. Deactivate instead.'
      });
    }
    
    await account.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Bank account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener movimientos de cuenta
// @route   GET /api/bank-accounts/:id/movements
// @access  Private
exports.getMovements = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      type,
      page = 1,
      limit = 20
    } = req.query;
    
    const account = await BankAccount.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }
    
    let movements = [...account.movements];
    
    // Filtrar por fecha
    if (startDate) {
      movements = movements.filter(m => new Date(m.date) >= new Date(startDate));
    }
    if (endDate) {
      movements = movements.filter(m => new Date(m.date) <= new Date(endDate));
    }
    
    // Filtrar por tipo
    if (type) {
      movements = movements.filter(m => m.type === type);
    }
    
    // Ordenar por fecha descendente
    movements.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Paginar
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    const paginatedMovements = movements.slice(skip, skip + limitValue);
    const total = movements.length;
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: paginatedMovements,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Transferir entre cuentas
// @route   POST /api/bank-accounts/transfer
// @access  Private/Admin
exports.transferBetweenAccounts = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { fromAccountId, toAccountId, amount, description } = req.body;
    
    if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'fromAccountId, toAccountId and amount are required'
      });
    }
    
    if (fromAccountId === toAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to the same account'
      });
    }
    
    const result = await BankAccount.transfer(
      fromAccountId,
      toAccountId,
      amount,
      description || 'Internal transfer',
      req.user.id,
      session
    );
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      data: result,
      message: 'Transfer completed successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Conciliar movimientos
// @route   POST /api/bank-accounts/:id/reconcile
// @access  Private/Admin
exports.reconcileMovements = async (req, res, next) => {
  try {
    const { movementIds } = req.body;
    
    if (!movementIds || !Array.isArray(movementIds) || movementIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'movementIds array is required'
      });
    }
    
    const result = await bankService.reconcileMovements(
      req.params.id,
      movementIds,
      req.user.id
    );
    
    res.status(200).json({
      success: true,
      data: result,
      message: `${result.reconciled} movements reconciled successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener reporte de cuenta por período
// @route   GET /api/bank-accounts/:id/report
// @access  Private
exports.getAccountReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const report = await bankService.getAccountReport(
      req.params.id,
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

// @desc    Obtener dashboard financiero
// @route   GET /api/bank-accounts/dashboard
// @access  Private
exports.getFinancialDashboard = async (req, res, next) => {
  try {
    const dashboard = await bankService.getFinancialDashboard();
    
    res.status(200).json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Estadísticas de cuentas bancarias
// @route   GET /api/bank-accounts/stats
// @access  Private
exports.getBankStats = async (req, res, next) => {
  try {
    const totalAccounts = await BankAccount.countDocuments();
    const activeAccounts = await BankAccount.countDocuments({ isActive: true });
    const inactiveAccounts = totalAccounts - activeAccounts;
    
    const byType = await BankAccount.aggregate([
      { $group: { _id: '$accountType', count: { $sum: 1 }, totalBalance: { $sum: '$balance' } } }
    ]);
    
    const byCurrency = await BankAccount.aggregate([
      { $group: { _id: '$currency', count: { $sum: 1 }, totalBalance: { $sum: '$balance' } } }
    ]);
    
    const totalBalance = await BankAccount.aggregate([
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]);
    
    const defaultAccount = await BankAccount.findOne({ isDefault: true });
    
    res.status(200).json({
      success: true,
      data: {
        total: totalAccounts,
        active: activeAccounts,
        inactive: inactiveAccounts,
        byType,
        byCurrency,
        totalBalance: totalBalance[0]?.total || 0,
        defaultAccount: defaultAccount ? {
          id: defaultAccount._id,
          name: defaultAccount.fullName,
          balance: defaultAccount.balance
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};