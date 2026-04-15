const Invoice = require('../models/Invoice');
const Sale = require('../models/Sale');
const Client = require('../models/Client');
const afipService = require('../services/afipService');
const pdfService = require('../services/pdfService');
const { filterObj, paginate, formatPagination } = require('../utils/helpers');

// @desc    Obtener todas las facturas
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      clientId,
      invoiceType,
      status,
      search,
      orderBy = 'issueDate_desc'
    } = req.query;
    
    const filter = {};
    
    if (clientId) filter.clientId = clientId;
    if (invoiceType) filter.invoiceType = invoiceType;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.issueDate = {};
      if (startDate) filter.issueDate.$gte = new Date(startDate);
      if (endDate) filter.issueDate.$lte = new Date(endDate);
    }
    
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'receiver.businessName': { $regex: search, $options: 'i' } },
        { 'receiver.taxId': { $regex: search, $options: 'i' } }
      ];
    }
    
    let sort = {};
    switch(orderBy) {
      case 'issueDate_asc':
        sort = { issueDate: 1 };
        break;
      case 'issueDate_desc':
        sort = { issueDate: -1 };
        break;
      case 'invoiceNumber':
        sort = { sequentialNumber: -1 };
        break;
      case 'total':
        sort = { total: -1 };
        break;
      default:
        sort = { issueDate: -1 };
    }
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    const invoices = await Invoice.find(filter)
      .populate('clientId', 'name email phone')
      .populate('saleId', 'saleNumber total')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitValue);
    
    const total = await Invoice.countDocuments(filter);
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: invoices,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener factura por ID
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('clientId', 'name email phone document addresses')
      .populate('saleId', 'saleNumber date total items')
      .populate('createdBy', 'name email')
      .populate('cancelledBy', 'name email');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener factura por número
// @route   GET /api/invoices/number/:invoiceNumber
// @access  Private
exports.getInvoiceByNumber = async (req, res, next) => {
  try {
    const { invoiceNumber } = req.params;
    
    const invoice = await Invoice.findOne({ invoiceNumber })
      .populate('clientId', 'name email')
      .populate('saleId', 'saleNumber');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generar factura desde venta
// @route   POST /api/invoices/from-sale/:saleId
// @access  Private/Admin
exports.createInvoiceFromSale = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { saleId } = req.params;
    const { invoiceType = 'B', pointOfSale = '0001' } = req.body;
    
    // 1. Buscar la venta
    const sale = await Sale.findById(saleId)
      .populate('clientId', 'name email document addresses creditAccount')
      .populate('items.productId', 'name');
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }
    
    // 2. Verificar si ya existe factura para esta venta
    const existingInvoice = await Invoice.findOne({ saleId });
    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: 'An invoice already exists for this sale',
        data: { invoiceNumber: existingInvoice.invoiceNumber }
      });
    }
    
    // 3. Obtener datos del emisor (configuración por defecto)
    const defaultEmitter = await Invoice.getDefaultEmitter();
    
    // 4. Preparar datos del receptor
    const receiver = {
      businessName: sale.clientId.name,
      taxId: sale.clientId.document || '99999999999',
      taxIdType: sale.clientId.documentType || 'DNI',
      address: sale.clientId.addresses.find(a => a.isMain) || {},
      email: sale.clientId.email,
      phone: sale.clientId.phone
    };
    
    // 5. Preparar detalles de la factura
    const details = [];
    let subtotal = 0;
    let totalDiscount = 0;
    
    for (const item of sale.items) {
      const vatRate = 21; // Por defecto 21%
      const vatAmount = (item.subtotal * vatRate) / 100;
      const totalItem = item.subtotal + vatAmount - (item.discount || 0);
      
      details.push({
        productId: item.productId,
        description: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        subtotal: item.subtotal,
        vatRate,
        vatAmount,
        total: totalItem
      });
      
      subtotal += item.subtotal;
      totalDiscount += item.discount || 0;
    }
    
    // 6. Calcular impuestos
    const vat21Amount = details
      .filter(d => d.vatRate === 21)
      .reduce((sum, d) => sum + d.vatAmount, 0);
    
    const taxes = [{
      type: 'IVA_21',
      rate: 21,
      amount: vat21Amount,
      taxableAmount: subtotal
    }];
    
    const totalTaxes = vat21Amount;
    const total = subtotal - totalDiscount + totalTaxes;
    
    // 7. Crear factura
    const invoice = new Invoice({
      invoiceType,
      pointOfSale,
      saleId: sale._id,
      saleNumber: sale.saleNumber,
      clientId: sale.clientId._id,
      emitter: {
        ...defaultEmitter,
        pointOfSale
      },
      receiver,
      details,
      subtotal,
      totalDiscount,
      taxes,
      totalTaxes,
      total,
      paymentMethod: sale.payments[0]?.method || 'cash',
      bankAccountId: sale.payments[0]?.bankAccountId,
      status: 'draft',
      createdBy: req.user.id
    });
    
    await invoice.save({ session });
    
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Emitir factura (autorizar en AFIP y generar PDF)
// @route   POST /api/invoices/:id/issue
// @access  Private/Admin
exports.issueInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('saleId', 'items');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    if (invoice.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Invoice cannot be issued. Current status: ${invoice.status}`
      });
    }
    
    // 1. Autorizar en AFIP (solo para tipos A, B, C)
    let afipResult = null;
    if (['A', 'B', 'C'].includes(invoice.invoiceType)) {
      try {
        afipResult = await afipService.authorizeInvoice(invoice.toObject());
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'AFIP authorization failed',
          error: error.message
        });
      }
    }
    
    // 2. Marcar como emitida
    await invoice.markAsIssued(afipResult);
    
    // 3. Generar PDF
    const pdfBuffer = await pdfService.generateInvoicePDF(invoice.toObject());
    const pdfUrl = await pdfService.savePDF(pdfBuffer, invoice.invoiceNumber);
    invoice.pdfUrl = pdfUrl;
    await invoice.save();
    
    // 4. Enviar por email (opcional)
    if (invoice.receiver.email) {
      await pdfService.sendInvoiceByEmail(
        invoice.receiver.email,
        invoice.invoiceNumber,
        pdfBuffer
      );
    }
    
    res.status(200).json({
      success: true,
      data: invoice,
      message: 'Invoice issued successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancelar factura
// @route   PUT /api/invoices/:id/cancel
// @access  Private/Admin
exports.cancelInvoice = async (req, res, next) => {
  try {
    const { reason } = req.body;
    
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    await invoice.cancel(req.user.id, reason || 'Cancelled by user');
    
    res.status(200).json({
      success: true,
      data: invoice,
      message: 'Invoice cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Descargar PDF de factura
// @route   GET /api/invoices/:id/pdf
// @access  Private
exports.downloadPDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    if (!invoice.pdfUrl) {
      // Generar PDF si no existe
      const pdfBuffer = await pdfService.generateInvoicePDF(invoice.toObject());
      const pdfUrl = await pdfService.savePDF(pdfBuffer, invoice.invoiceNumber);
      invoice.pdfUrl = pdfUrl;
      await invoice.save();
    }
    
    // Enviar archivo
    const filePath = path.join(__dirname, '../..', invoice.pdfUrl);
    res.download(filePath, `factura-${invoice.invoiceNumber}.pdf`);
  } catch (error) {
    next(error);
  }
};

// @desc    Estadísticas de facturación
// @route   GET /api/invoices/stats
// @access  Private
exports.getInvoiceStats = async (req, res, next) => {
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
    
    const byType = await Invoice.getSummaryByType(start, end);
    
    const totalInvoices = await Invoice.countDocuments({
      issueDate: { $gte: start, $lte: end },
      status: 'issued'
    });
    
    const totalAmount = await Invoice.aggregate([
      {
        $match: {
          issueDate: { $gte: start, $lte: end },
          status: 'issued'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          totalTaxes: { $sum: '$totalTaxes' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        totalInvoices,
        totalAmount: totalAmount[0]?.total || 0,
        totalTaxes: totalAmount[0]?.totalTaxes || 0,
        byType
      }
    });
  } catch (error) {
    next(error);
  }
};