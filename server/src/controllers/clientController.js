const Client = require('../models/Client');
const Sale = require('../models/Sale');
const { filterObj, paginate, formatPagination } = require('../utils/helpers');
const creditService = require('../services/creditService');

// @desc    Obtener todos los clientes
// @route   GET /api/clients
// @access  Private
exports.getClients = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      isActive,
      isVip,
      category,
      search,
      orderBy = 'name'
    } = req.query;
    
    // Construir filtro de búsqueda
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isVip !== undefined) filter.isVip = isVip === 'true';
    if (category) filter.clientCategory = category;
    
    // Búsqueda por texto en múltiples campos
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { document: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Configurar ordenamiento
    let sort = {};
    switch(orderBy) {
      case 'name':
        sort = { name: 1 };
        break;
      case 'totalSpent':
        sort = { totalSpent: -1 };
        break;
      case 'lastPurchase':
        sort = { lastPurchase: -1 };
        break;
      case 'category':
        sort = { clientCategory: -1 };
        break;
      default:
        sort = { name: 1 };
    }
    
    // Paginación
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    const clients = await Client.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitValue);
    
    const total = await Client.countDocuments(filter);
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: clients,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener cliente por ID
// @route   GET /api/clients/:id
// @access  Private
exports.getClientById = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('purchaseHistory.products.productId', 'name images')
      .populate('preferences.preferredCategories', 'name');
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: client
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear cliente
// @route   POST /api/clients
// @access  Private/Admin
exports.createClient = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      document,
      documentType,
      birthDate,
      addresses,
      preferences,
      notes,
      subscribesToNewsletter,
      howDidYouFindUs
    } = req.body;
    
    // Verificar si ya existe cliente con mismo email o documento
    const existingClient = await Client.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { document: document }
      ]
    });
    
    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un cliente con este email o documento'
      });
    }
    
    // Crear nuevo cliente
    const client = await Client.create({
      name,
      email: email.toLowerCase(),
      phone,
      document,
      documentType: documentType || 'DNI',
      birthDate,
      addresses: addresses || [],
      preferences: preferences || {},
      notes,
      subscribesToNewsletter: subscribesToNewsletter || false,
      howDidYouFindUs: howDidYouFindUs || 'other'
    });
    
    res.status(201).json({
      success: true,
      data: client,
      message: 'Cliente creado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar cliente
// @route   PUT /api/clients/:id
// @access  Private/Admin
exports.updateClient = async (req, res, next) => {
  try {
    // Campos permitidos para actualización
    const allowedFields = [
      'name', 'email', 'phone', 'document',
      'documentType', 'birthDate', 'addresses',
      'preferences', 'isActive', 'isVip', 'notes', 
      'subscribesToNewsletter', 'howDidYouFindUs', 'clientCategory'
    ];
    
    const filteredBody = filterObj(req.body, ...allowedFields);
    
    // Validar email único si se está actualizando
    if (filteredBody.email) {
      filteredBody.email = filteredBody.email.toLowerCase();
      const existingClient = await Client.findOne({
        email: filteredBody.email,
        _id: { $ne: req.params.id }
      });
      
      if (existingClient) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro cliente con este email'
        });
      }
    }
    
    // Actualizar cliente
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: client,
      message: 'Cliente actualizado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar cliente (soft delete)
// @route   DELETE /api/clients/:id
// @access  Private/Admin
exports.deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    // Verificar si tiene ventas asociadas
    const hasSales = await Sale.countDocuments({ clientId: client._id });
    if (hasSales > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el cliente porque tiene ${hasSales} ventas asociadas`
      });
    }
    
    // Soft delete - solo desactivar
    client.isActive = false;
    await client.save();
    
    res.status(200).json({
      success: true,
      message: 'Cliente desactivado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Habilitar cuenta corriente
// @route   POST /api/clients/:id/credit/enable
// @access  Private/Admin
exports.enableCredit = async (req, res, next) => {
  try {
    const { creditLimit } = req.body;
    
    if (!creditLimit || creditLimit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El límite de crédito debe ser mayor a 0'
      });
    }
    
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    // Habilitar cuenta corriente
    client.creditAccount.isEnabled = true;
    client.creditAccount.creditLimit = creditLimit;
    client.creditAccount.balance = 0;
    client.creditAccount.activationDate = new Date();
    
    await client.save();
    
    res.status(200).json({
      success: true,
      data: client.creditAccount,
      message: 'Cuenta corriente habilitada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deshabilitar cuenta corriente
// @route   POST /api/clients/:id/credit/disable
// @access  Private/Admin
exports.disableCredit = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    // Verificar si tiene saldo pendiente
    if (client.creditAccount.balance > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede deshabilitar la cuenta corriente porque tiene saldo pendiente'
      });
    }
    
    client.creditAccount.isEnabled = false;
    await client.save();
    
    res.status(200).json({
      success: true,
      message: 'Cuenta corriente deshabilitada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Registrar pago a cuenta corriente (usando creditService)
// @route   POST /api/clients/:id/credit/payment
// @access  Private/Admin
exports.registerCreditPayment = async (req, res, next) => {
  try {
    const { amount, description, referenceId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto debe ser mayor a 0'
      });
    }
    
    // Usar el servicio de crédito para registrar el pago
    const result = await creditService.registerPayment(
      req.params.id,
      amount,
      description,
      referenceId,
      req.user.id
    );
    
    res.status(200).json({
      success: true,
      data: result,
      message: 'Pago registrado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener resumen de cuenta corriente (usando creditService)
// @route   GET /api/clients/:id/credit/summary
// @access  Private
exports.getCreditSummary = async (req, res, next) => {
  try {
    const summary = await creditService.getCreditSummary(req.params.id);
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verificar límite de crédito antes de una compra (usando creditService)
// @route   GET /api/clients/:id/credit/check
// @access  Private
exports.checkCreditLimit = async (req, res, next) => {
  try {
    const { amount } = req.query;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto es requerido y debe ser mayor a 0'
      });
    }
    
    const result = await creditService.checkCreditBeforeSale(req.params.id, parseFloat(amount));
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener historial de compras del cliente
// @route   GET /api/clients/:id/purchases
// @access  Private
exports.getPurchaseHistory = async (req, res, next) => {
  try {
    const { startDate, endDate, status, page = 1, limit = 10 } = req.query;
    
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    // Obtener historial de compras
    let purchaseHistory = [...client.purchaseHistory];
    
    // Filtrar por fecha
    if (startDate) {
      purchaseHistory = purchaseHistory.filter(p => new Date(p.date) >= new Date(startDate));
    }
    if (endDate) {
      purchaseHistory = purchaseHistory.filter(p => new Date(p.date) <= new Date(endDate));
    }
    
    // Filtrar por estado
    if (status) {
      purchaseHistory = purchaseHistory.filter(p => p.status === status);
    }
    
    // Ordenar por fecha descendente (más reciente primero)
    purchaseHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Paginación
    const total = purchaseHistory.length;
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    const paginatedHistory = purchaseHistory.slice(skip, skip + limitValue);
    
    res.status(200).json({
      success: true,
      data: paginatedHistory,
      pagination: formatPagination(total, currentPage, limitValue)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener clientes con riesgo de crédito (usando modelo, pero creditService tiene método similar)
// @route   GET /api/clients/credit-risk
// @access  Private/Admin
exports.getCreditRiskClients = async (req, res, next) => {
  try {
    const { percentage = 80 } = req.query;
    // Usar método estático del modelo
    const clients = await Client.getClientsWithCreditRisk(parseInt(percentage));
    
    // Enriquecer con información adicional usando creditService si es necesario
    const clientsWithDetails = await Promise.all(clients.map(async (client) => {
      const summary = await creditService.getCreditSummary(client._id);
      return {
        ...client.toObject(),
        creditSummary: summary
      };
    }));
    
    res.status(200).json({
      success: true,
      data: clientsWithDetails,
      total: clientsWithDetails.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Estadísticas de clientes
// @route   GET /api/clients/stats
// @access  Private
exports.getClientStats = async (req, res, next) => {
  try {
    // Estadísticas básicas
    const totalClients = await Client.countDocuments();
    const activeClients = await Client.countDocuments({ isActive: true });
    const inactiveClients = totalClients - activeClients;
    const vipClients = await Client.countDocuments({ isVip: true });
    const creditEnabled = await Client.countDocuments({ 'creditAccount.isEnabled': true });
    
    // Distribución por categoría
    const categories = await Client.aggregate([
      { $group: { _id: '$clientCategory', count: { $sum: 1 } } }
    ]);
    
    // Total gastado acumulado
    const totalSpent = await Client.aggregate([
      { $group: { _id: null, total: { $sum: '$totalSpent' } } }
    ]);
    
    // Promedio de gasto por cliente
    const averageSpent = totalSpent[0]?.total / totalClients || 0;
    
    // Deuda total de clientes
    const clientsWithDebt = await Client.aggregate([
      { $match: { 'creditAccount.balance': { $gt: 0 } } },
      { $group: { _id: null, totalDebt: { $sum: '$creditAccount.balance' } } }
    ]);
    
    // Clientes que han alcanzado el límite de crédito
    const clientsAtLimit = await Client.countDocuments({
      'creditAccount.isEnabled': true,
      $expr: { $gte: ['$creditAccount.balance', '$creditAccount.creditLimit'] }
    });
    
    res.status(200).json({
      success: true,
      data: {
        total: totalClients,
        active: activeClients,
        inactive: inactiveClients,
        vip: vipClients,
        creditEnabled: creditEnabled,
        creditAtLimit: clientsAtLimit,
        categoryDistribution: categories,
        totalSpentAccumulated: totalSpent[0]?.total || 0,
        averageSpentPerClient: averageSpent,
        totalClientDebt: clientsWithDebt[0]?.totalDebt || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Agregar dirección al cliente
// @route   POST /api/clients/:id/addresses
// @access  Private/Admin
exports.addAddress = async (req, res, next) => {
  try {
    const { street, number, floor, apartment, locality, city, province, zipCode, label, isMain } = req.body;
    
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    // Si la nueva dirección es principal, quitar el flag de otras direcciones
    if (isMain) {
      client.addresses.forEach(addr => {
        addr.isMain = false;
      });
    }
    
    // Agregar nueva dirección
    client.addresses.push({
      street,
      number,
      floor,
      apartment,
      locality,
      city,
      province,
      zipCode,
      label: label || 'home',
      isMain: isMain || false
    });
    
    await client.save();
    
    res.status(201).json({
      success: true,
      data: client.addresses,
      message: 'Dirección agregada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar dirección
// @route   PUT /api/clients/:id/addresses/:addressId
// @access  Private/Admin
exports.updateAddress = async (req, res, next) => {
  try {
    const { id, addressId } = req.params;
    const updateData = req.body;
    
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    // Encontrar la dirección
    const address = client.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Dirección no encontrada'
      });
    }
    
    // Si se está marcando como principal, actualizar otras direcciones
    if (updateData.isMain) {
      client.addresses.forEach(addr => {
        addr.isMain = false;
      });
    }
    
    // Actualizar campos
    Object.keys(updateData).forEach(key => {
      if (key !== '_id') {
        address[key] = updateData[key];
      }
    });
    
    await client.save();
    
    res.status(200).json({
      success: true,
      data: client.addresses,
      message: 'Dirección actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar dirección
// @route   DELETE /api/clients/:id/addresses/:addressId
// @access  Private/Admin
exports.deleteAddress = async (req, res, next) => {
  try {
    const { id, addressId } = req.params;
    
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    // Eliminar dirección
    client.addresses.id(addressId).remove();
    await client.save();
    
    res.status(200).json({
      success: true,
      data: client.addresses,
      message: 'Dirección eliminada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar preferencias del cliente
// @route   PUT /api/clients/:id/preferences
// @access  Private/Admin
exports.updatePreferences = async (req, res, next) => {
  try {
    const { sizes, favoriteColors, preferredCategories, favoriteBrands, shoeSize, pantsSize, observations } = req.body;
    
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }
    
    // Actualizar preferencias
    if (sizes) client.preferences.sizes = sizes;
    if (favoriteColors) client.preferences.favoriteColors = favoriteColors;
    if (preferredCategories) client.preferences.preferredCategories = preferredCategories;
    if (favoriteBrands) client.preferences.favoriteBrands = favoriteBrands;
    if (shoeSize) client.preferences.shoeSize = shoeSize;
    if (pantsSize) client.preferences.pantsSize = pantsSize;
    if (observations) client.preferences.observations = observations;
    
    await client.save();
    
    res.status(200).json({
      success: true,
      data: client.preferences,
      message: 'Preferencias actualizadas exitosamente'
    });
  } catch (error) {
    next(error);
  }
};