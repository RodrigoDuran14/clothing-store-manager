const Return = require('../models/Return');
const Sale = require('../models/Sale');
const Client = require('../models/Client');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const stockService = require('../services/stockService');
const refundService = require('../services/refundService');
const { filterObj, paginate, formatPagination } = require('../utils/helpers');

// @desc    Obtener todas las devoluciones
// @route   GET /api/returns
// @access  Private
exports.getReturns = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      clientId,
      saleId,
      status,
      reason,
      search,
      orderBy = 'createdAt_desc'
    } = req.query;
    
    // Construir filtro
    const filter = {};
    
    if (clientId) filter.clientId = clientId;
    if (saleId) filter.saleId = saleId;
    if (status) filter.status = status;
    if (reason) filter.reason = reason;
    
    // Búsqueda por número de devolución o número de venta
    if (search) {
      filter.$or = [
        { returnNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filtro de fecha
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
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
      case 'totalRefund_asc':
        sort = { totalRefund: 1 };
        break;
      case 'totalRefund_desc':
        sort = { totalRefund: -1 };
        break;
      case 'returnNumber':
        sort = { returnNumber: 1 };
        break;
      default:
        sort = { createdAt: -1 };
    }
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    const returns = await Return.find(filter)
      .populate('clientId', 'name email phone')
      .populate('sellerId', 'firstName lastName')
      .populate('processedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitValue);
    
    const total = await Return.countDocuments(filter);
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: returns,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener devolución por ID
// @route   GET /api/returns/:id
// @access  Private
exports.getReturnById = async (req, res, next) => {
  try {
    const returnData = await Return.findById(req.params.id)
      .populate('clientId', 'name email phone document')
      .populate('sellerId', 'firstName lastName')
      .populate('processedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('saleId', 'saleNumber date total');
    
    if (!returnData) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: returnData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener devolución por número
// @route   GET /api/returns/number/:returnNumber
// @access  Private
exports.getReturnByNumber = async (req, res, next) => {
  try {
    const { returnNumber } = req.params;
    
    const returnData = await Return.findOne({ returnNumber })
      .populate('clientId', 'name email')
      .populate('saleId', 'saleNumber date total');
    
    if (!returnData) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: returnData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear devolución
// @route   POST /api/returns
// @access  Private/Admin
exports.createReturn = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const {
      saleId,
      items,
      reason,
      reasonDescription,
      refundMethod,
      images,
      notes
    } = req.body;
    
    // 1. Validar venta original
    const sale = await Sale.findById(saleId)
      .populate('clientId', 'name email creditAccount')
      .populate('sellerId', 'firstName lastName');
    
    if (!sale) {
      throw new Error('Original sale not found');
    }
    
    if (sale.status === 'cancelled') {
      throw new Error('Cannot create return for cancelled sale');
    }
    
    // 2. Validar período de devolución (30 días)
    const periodCheck = refundService.validateReturnPeriod(sale.date, 30);
    if (!periodCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: periodCheck.reason,
        data: {
          daysSinceSale: periodCheck.daysSinceSale,
          daysRemaining: periodCheck.daysRemaining
        }
      });
    }
    
    // 3. Validar que no exista devolución previa para esta venta
    const existingReturn = await Return.findOne({ saleId, status: { $ne: 'cancelled' } });
    if (existingReturn) {
      return res.status(400).json({
        success: false,
        message: 'A return already exists for this sale',
        data: { returnNumber: existingReturn.returnNumber }
      });
    }
    
    // 4. Calcular monto a reembolsar
    const refundCalculation = refundService.calculateRefundAmount(items, sale.items);
    
    // 5. Verificar stock (para restauración)
    const stockCheck = await stockService.checkStockForSale(items);
    // Para devoluciones, verificamos que los items existan
    
    // 6. Crear devolución
    const returnData = new Return({
      saleId,
      clientId: sale.clientId._id,
      sellerId: sale.sellerId._id,
      items: refundCalculation.items,
      subtotal: refundCalculation.totalRefund,
      totalRefund: refundCalculation.totalRefund,
      refundMethod,
      reason,
      reasonDescription,
      images: images || [],
      processedBy: req.user.id,
      status: 'pending',
      tracking: [{
        status: 'pending_review',
        note: 'Return created, pending review',
        userId: req.user.id
      }]
    });
    
    await returnData.save({ session });
    
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      data: returnData,
      message: 'Return created successfully. Awaiting approval.'
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Aprobar devolución
// @route   PUT /api/returns/:id/approve
// @access  Private/Admin
exports.approveReturn = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { notes } = req.body;
    
    const returnData = await Return.findById(req.params.id);
    if (!returnData) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }
    
    if (!returnData.canModify()) {
      return res.status(400).json({
        success: false,
        message: `Return cannot be approved. Current status: ${returnData.status}`
      });
    }
    
    // Aprobar devolución
    await returnData.approve(req.user.id, notes);
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      data: returnData,
      message: 'Return approved successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Rechazar devolución
// @route   PUT /api/returns/:id/reject
// @access  Private/Admin
exports.rejectReturn = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { reason } = req.body;
    
    const returnData = await Return.findById(req.params.id);
    if (!returnData) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }
    
    if (!returnData.canModify()) {
      return res.status(400).json({
        success: false,
        message: `Return cannot be rejected. Current status: ${returnData.status}`
      });
    }
    
    // Rechazar devolución
    await returnData.reject(req.user.id, reason);
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      data: returnData,
      message: 'Return rejected successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Procesar devolución (restaurar stock y procesar reembolso)
// @route   POST /api/returns/:id/process
// @access  Private/Admin
exports.processReturn = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const returnData = await Return.findById(req.params.id)
      .populate('clientId')
      .populate('saleId');
    
    if (!returnData) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }
    
    if (returnData.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Return must be approved before processing. Current status: ${returnData.status}`
      });
    }
    
    // 1. Restaurar stock
    const itemsToRestore = returnData.items.map(item => ({
      productId: item.productId,
      size: item.size,
      color: item.color,
      quantity: item.quantity
    }));
    
    await stockService.restoreStockForCancellation(itemsToRestore, returnData._id, session);
    returnData.restocked = true;
    
    // 2. Procesar reembolso
    const refundResult = await refundService.processRefund(
      {
        returnNumber: returnData.returnNumber,
        totalRefund: returnData.totalRefund,
        refundMethod: returnData.refundMethod,
        refundDetails: returnData.refundDetails,
        returnId: returnData._id,
        saleId: returnData.saleId._id,
        processedBy: req.user.id
      },
      returnData.saleId,
      returnData.clientId,
      session
    );
    
    // 3. Actualizar detalles del reembolso
    returnData.refundDetails = {
      ...returnData.refundDetails,
      ...refundResult.details,
      processedAt: new Date()
    };
    returnData.refundProcessed = true;
    returnData.refundProcessedAt = new Date();
    
    // 4. Completar devolución
    await returnData.complete(req.user.id, returnData.refundDetails);
    
    // 5. Actualizar estado de la venta original
    await refundService.updateSaleAfterReturn(returnData.saleId._id, returnData.totalRefund, session);
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      data: {
        return: returnData,
        refund: refundResult
      },
      message: 'Return processed successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Cancelar devolución
// @route   PUT /api/returns/:id/cancel
// @access  Private/Admin
exports.cancelReturn = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { reason } = req.body;
    
    const returnData = await Return.findById(req.params.id);
    if (!returnData) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }
    
    if (!returnData.canCancel()) {
      return res.status(400).json({
        success: false,
        message: `Return cannot be cancelled. Current status: ${returnData.status}`
      });
    }
    
    returnData.status = 'cancelled';
    await returnData.addTracking('cancelled', reason || 'Return cancelled', req.user.id);
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      data: returnData,
      message: 'Return cancelled successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Obtener estadísticas de devoluciones
// @route   GET /api/returns/stats
// @access  Private
exports.getReturnStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const stats = await Return.getReturnStats(start, end);
    
    // Devoluciones por estado
    const returnsByStatus = await Return.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRefund: { $sum: '$totalRefund' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        ...stats,
        byStatus: returnsByStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener devoluciones por cliente
// @route   GET /api/returns/client/:clientId
// @access  Private
exports.getReturnsByClient = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { limit = 10 } = req.query;
    
    const returns = await Return.find({ clientId })
      .populate('saleId', 'saleNumber date total')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: returns,
      total: returns.length
    });
  } catch (error) {
    next(error);
  }
};