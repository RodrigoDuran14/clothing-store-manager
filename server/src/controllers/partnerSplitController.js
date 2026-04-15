const PartnerSplit = require('../models/PartnerSplit');
const Partner = require('../models/Partner');
const Sale = require('../models/Sale');
const partnerSplitService = require('../services/partnerSplitService');
const { paginate, formatPagination } = require('../utils/helpers');

// @desc    Obtener todas las divisiones de ingresos
// @route   GET /api/partner-splits
// @access  Private/Admin
exports.getPartnerSplits = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      partnerId,
      status,
      saleId
    } = req.query;
    
    const filter = {};
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    if (partnerId) filter['splits.partnerId'] = partnerId;
    if (status) filter.status = status;
    if (saleId) filter.saleId = saleId;
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    const splits = await PartnerSplit.find(filter)
      .populate('saleId', 'saleNumber clientId total')
      .populate('splits.partnerId', 'name')
      .populate('processedBy', 'name email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitValue);
    
    const total = await PartnerSplit.countDocuments(filter);
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: splits,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener división por ID
// @route   GET /api/partner-splits/:id
// @access  Private/Admin
exports.getPartnerSplitById = async (req, res, next) => {
  try {
    const split = await PartnerSplit.findById(req.params.id)
      .populate('saleId', 'saleNumber clientId total date')
      .populate('splits.partnerId', 'name email ownershipPercentage')
      .populate('processedBy', 'name email');
    
    if (!split) {
      return res.status(404).json({
        success: false,
        message: 'Partner split not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: split
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener divisiones por venta
// @route   GET /api/partner-splits/sale/:saleId
// @access  Private/Admin
exports.getSplitsBySale = async (req, res, next) => {
  try {
    const { saleId } = req.params;
    
    const splits = await PartnerSplit.findOne({ saleId })
      .populate('splits.partnerId', 'name');
    
    if (!splits) {
      return res.status(404).json({
        success: false,
        message: 'No splits found for this sale'
      });
    }
    
    res.status(200).json({
      success: true,
      data: splits
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener divisiones por socio (para el socio autenticado)
// @route   GET /api/partner-splits/my-splits
// @access  Private
exports.getMySplits = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;
    
    // Encontrar socio asociado al usuario
    const partner = await Partner.findOne({ userId: req.user.id });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'No partner associated with this user'
      });
    }
    
    const filter = {
      'splits.partnerId': partner._id,
      date: {}
    };
    
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
    
    if (!startDate && !endDate) delete filter.date;
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    const splits = await PartnerSplit.find(filter)
      .populate('saleId', 'saleNumber clientId total date')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitValue);
    
    // Extraer solo la parte del socio actual
    const mySplits = splits.map(split => {
      const mySplit = split.splits.find(s => s.partnerId.toString() === partner._id.toString());
      return {
        ...split.toObject(),
        mySplit,
        sale: split.saleId
      };
    });
    
    const total = await PartnerSplit.countDocuments(filter);
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: mySplits,
      pagination,
      partner: {
        id: partner._id,
        name: partner.name
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear división de ingresos manualmente (para casos especiales)
// @route   POST /api/partner-splits
// @access  Private/Admin
exports.createPartnerSplit = async (req, res, next) => {
  try {
    const {
      saleId,
      splits,
      paymentMethod,
      notes
    } = req.body;
    
    // Verificar que la venta exista
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }
    
    // Verificar que no exista ya una división para esta venta
    const existingSplit = await PartnerSplit.findOne({ saleId });
    if (existingSplit) {
      return res.status(400).json({
        success: false,
        message: 'A split already exists for this sale'
      });
    }
    
    // Calcular total de los splits
    const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
    
    if (Math.abs(totalSplit - sale.total) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Split total (${totalSplit}) does not match sale total (${sale.total})`
      });
    }
    
    // Enriquecer splits con nombres de socios
    const enrichedSplits = await Promise.all(splits.map(async (split) => {
      const partner = await Partner.findById(split.partnerId);
      return {
        ...split,
        partnerName: partner ? partner.name : 'Unknown',
        percentage: (split.amount / sale.total) * 100
      };
    }));
    
    const partnerSplit = await PartnerSplit.create({
      saleId,
      saleNumber: sale.saleNumber,
      date: sale.date,
      totalAmount: sale.total,
      splits: enrichedSplits,
      paymentMethod,
      notes,
      processedBy: req.user.id,
      status: 'pending'
    });
    
    res.status(201).json({
      success: true,
      data: partnerSplit,
      message: 'Partner split created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Procesar división (registrar movimientos en cajas/cuentas)
// @route   POST /api/partner-splits/:id/process
// @access  Private/Admin
exports.processPartnerSplit = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const partnerSplit = await PartnerSplit.findById(req.params.id);
    
    if (!partnerSplit) {
      return res.status(404).json({
        success: false,
        message: 'Partner split not found'
      });
    }
    
    if (partnerSplit.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Partner split already completed'
      });
    }
    
    // Procesar cada split
    for (const split of partnerSplit.splits) {
      if (!split.registered) {
        const result = await partnerSplitService.registerPartnerIncome(
          split.partnerId,
          split.amount,
          partnerSplit.saleId,
          partnerSplit.paymentMethod,
          req.user.id,
          session
        );
        
        await partnerSplit.markSplitRegistered(
          split.partnerId,
          result.movement._id,
          result.destination,
          result.accountId
        );
      }
    }
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      data: partnerSplit,
      message: 'Partner split processed successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Obtener resumen de splits por período
// @route   GET /api/partner-splits/summary
// @access  Private/Admin
exports.getSplitSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const summary = await PartnerSplit.getSummaryByPeriod(
      new Date(startDate),
      new Date(endDate)
    );
    
    res.status(200).json({
      success: true,
      data: summary,
      period: { startDate, endDate }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener dashboard de socio autenticado
// @route   GET /api/partner-splits/my-dashboard
// @access  Private
exports.getMyDashboard = async (req, res, next) => {
  try {
    const partner = await Partner.findOne({ userId: req.user.id })
      .populate('bankAccounts', 'bankName accountNumber balance')
      .populate('cashRegisterId');
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'No partner associated with this user'
      });
    }
    
    // Obtener splits del último mes
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const monthSplits = await PartnerSplit.find({
      'splits.partnerId': partner._id,
      date: { $gte: startOfMonth },
      status: 'completed'
    });
    
    let totalMonthIncome = 0;
    let saleCount = 0;
    
    for (const split of monthSplits) {
      const mySplit = split.splits.find(s => s.partnerId.toString() === partner._id.toString());
      if (mySplit) {
        totalMonthIncome += mySplit.amount;
        saleCount++;
      }
    }
    
    // Últimos 10 splits
    const recentSplits = await PartnerSplit.find({
      'splits.partnerId': partner._id
    })
      .populate('saleId', 'saleNumber date')
      .sort({ date: -1 })
      .limit(10);
    
    const myRecentSplits = recentSplits.map(split => {
      const mySplit = split.splits.find(s => s.partnerId.toString() === partner._id.toString());
      return {
        splitId: split._id,
        saleNumber: split.saleNumber,
        date: split.date,
        amount: mySplit?.amount || 0,
        registered: mySplit?.registered || false
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        partner: {
          id: partner._id,
          name: partner.name,
          ownershipPercentage: partner.ownershipPercentage
        },
        cashRegister: partner.cashRegisterId,
        bankAccounts: partner.bankAccounts,
        monthlySummary: {
          totalIncome: totalMonthIncome,
          saleCount,
          averagePerSale: saleCount > 0 ? totalMonthIncome / saleCount : 0
        },
        recentSplits: myRecentSplits
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener divisiones pendientes de procesar
// @route   GET /api/partner-splits/pending
// @access  Private/Admin
exports.getPendingSplits = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    const pendingSplits = await PartnerSplit.find({ status: 'pending' })
      .populate('saleId', 'saleNumber clientId total date')
      .populate('splits.partnerId', 'name')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limitValue);
    
    const total = await PartnerSplit.countDocuments({ status: 'pending' });
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: pendingSplits,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Procesar todas las divisiones pendientes
// @route   POST /api/partner-splits/process-all
// @access  Private/Admin
exports.processAllPendingSplits = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const pendingSplits = await PartnerSplit.find({ status: 'pending' });
    
    const results = [];
    
    for (const split of pendingSplits) {
      try {
        for (const splitItem of split.splits) {
          if (!splitItem.registered) {
            const result = await partnerSplitService.registerPartnerIncome(
              splitItem.partnerId,
              splitItem.amount,
              split.saleId,
              split.paymentMethod,
              req.user.id,
              session
            );
            
            await split.markSplitRegistered(
              splitItem.partnerId,
              result.movement._id,
              result.destination,
              result.accountId
            );
          }
        }
        results.push({
          splitId: split._id,
          saleNumber: split.saleNumber,
          status: 'success'
        });
      } catch (error) {
        results.push({
          splitId: split._id,
          saleNumber: split.saleNumber,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      data: results,
      message: `${results.filter(r => r.status === 'success').length} splits processed successfully`
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};