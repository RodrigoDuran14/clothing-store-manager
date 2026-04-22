const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const { filterObj, paginate, formatPagination } = require('../utils/helpers');

// @desc    Obtener todos los proveedores
// @route   GET /api/suppliers
// @access  Private
exports.getSuppliers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      isActive,
      search,
      rating,
      orderBy = 'name',
      taxCondition,
      paymentTerms
    } = req.query;
    
    // Construir filtro de búsqueda
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (rating) filter.rating = parseInt(rating);
    if (taxCondition) filter.taxCondition = taxCondition;
    if (paymentTerms) filter.paymentTerms = paymentTerms;
    
    // Búsqueda por nombre, email, contacto o teléfono
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contactName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Configurar ordenamiento
    let sort = {};
    switch(orderBy) {
      case 'name':
        sort = { name: 1 };
        break;
      case 'rating':
        sort = { rating: -1 };
        break;
      case 'totalPurchases':
        sort = { totalPurchases: -1 };
        break;
      case 'lastPurchase':
        sort = { lastPurchase: -1 };
        break;
      case 'debt':
        sort = { debt: -1 };
        break;
      default:
        sort = { name: 1 };
    }
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    const suppliers = await Supplier.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitValue);
    
    // Contar productos por proveedor
    const suppliersWithCount = await Promise.all(suppliers.map(async (supplier) => {
      const productsCount = await Product.countDocuments({
        supplierId: supplier._id,
        isActive: true
      });
      
      return {
        ...supplier.toObject(),
        productsCount,
        fullAddress: supplier.fullAddress
      };
    }));
    
    const total = await Supplier.countDocuments(filter);
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: suppliersWithCount,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener proveedor por ID
// @route   GET /api/suppliers/:id
// @access  Private
exports.getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }
    
    // Obtener productos de este proveedor
    const products = await Product.find({
      supplierId: supplier._id,
      isActive: true
    }).select('name description price cost stock totalStock variants');
    
    res.status(200).json({
      success: true,
      data: {
        ...supplier.toObject(),
        products,
        fullAddress: supplier.fullAddress,
        productsCount: products.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear proveedor
// @route   POST /api/suppliers
// @access  Private/Admin
exports.createSupplier = async (req, res, next) => {
  try {
    const {
      name,
      contactName,
      phone,
      phone2,
      email,
      address,
      taxId,
      taxCondition,
      notes,
      rating,
      deliveryTime,
      paymentTerms,
      bankInfo
    } = req.body;
    
    // Verificar si ya existe por nombre
    const existingSupplier = await Supplier.findOne({
      name: name.toUpperCase()
    });
    
    if (existingSupplier) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un proveedor con este nombre'
      });
    }
    
    // Verificar si ya existe por email
    const existingEmail = await Supplier.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un proveedor con este email'
      });
    }
    
    // Verificar taxId (CUIT) si fue proporcionado
    if (taxId) {
      const existingTaxId = await Supplier.findOne({ taxId });
      if (existingTaxId) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un proveedor con este CUIT'
        });
      }
    }
    
    const supplier = await Supplier.create({
      name: name.toUpperCase(),
      contactName,
      phone,
      phone2,
      email: email.toLowerCase(),
      address: address || {},
      taxId,
      taxCondition: taxCondition || 'responsible',
      notes,
      rating: rating || 3,
      deliveryTime: deliveryTime || 7,
      paymentTerms: paymentTerms || 'cash',
      bankInfo: bankInfo || {},
      suppliedProducts: []
    });
    
    res.status(201).json({
      success: true,
      data: {
        ...supplier.toObject(),
        fullAddress: supplier.fullAddress
      },
      message: 'Proveedor creado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar proveedor
// @route   PUT /api/suppliers/:id
// @access  Private/Admin
exports.updateSupplier = async (req, res, next) => {
  try {
    const allowedFields = [
      'name', 'contactName', 'phone', 'phone2', 'email',
      'address', 'taxId', 'taxCondition', 'notes', 'isActive',
      'rating', 'deliveryTime', 'paymentTerms', 'bankInfo', 'debt'
    ];
    
    const filteredBody = filterObj(req.body, ...allowedFields);
    
    // Si cambia el nombre, verificar que no exista otro
    if (filteredBody.name) {
      filteredBody.name = filteredBody.name.toUpperCase();
      const existingSupplier = await Supplier.findOne({
        name: filteredBody.name,
        _id: { $ne: req.params.id }
      });
      
      if (existingSupplier) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro proveedor con este nombre'
        });
      }
    }
    
    // Si cambia el email, verificar que no exista otro
    if (filteredBody.email) {
      filteredBody.email = filteredBody.email.toLowerCase();
      const existingSupplier = await Supplier.findOne({
        email: filteredBody.email,
        _id: { $ne: req.params.id }
      });
      
      if (existingSupplier) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro proveedor con este email'
        });
      }
    }
    
    // Si cambia el taxId, verificar que no exista otro
    if (filteredBody.taxId) {
      const existingSupplier = await Supplier.findOne({
        taxId: filteredBody.taxId,
        _id: { $ne: req.params.id }
      });
      
      if (existingSupplier) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro proveedor con este CUIT'
        });
      }
    }
    
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...supplier.toObject(),
        fullAddress: supplier.fullAddress
      },
      message: 'Proveedor actualizado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar proveedor (soft delete)
// @route   DELETE /api/suppliers/:id
// @access  Private/Admin
exports.deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }
    
    // Verificar si tiene productos asociados
    const hasProducts = await Product.countDocuments({
      supplierId: supplier._id,
      isActive: true
    });
    
    if (hasProducts > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el proveedor porque tiene ${hasProducts} productos asociados`
      });
    }
    
    // Soft delete
    supplier.isActive = false;
    await supplier.save();
    
    res.status(200).json({
      success: true,
      message: 'Proveedor desactivado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar proveedor permanentemente
// @route   DELETE /api/suppliers/:id/permanent
// @access  Private/Admin
exports.permanentDeleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }
    
    // Verificar si tiene productos asociados
    const hasProducts = await Product.countDocuments({ supplierId: supplier._id });
    if (hasProducts > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el proveedor porque tiene productos asociados'
      });
    }
    
    await supplier.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Proveedor eliminado permanentemente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Agregar producto a proveedor
// @route   POST /api/suppliers/:id/products
// @access  Private/Admin
exports.addProductToSupplier = async (req, res, next) => {
  try {
    const { productId } = req.body;
    
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Agregar producto al proveedor usando el método de instancia
    await supplier.addProduct(productId);
    
    // Actualizar el supplierId en el producto
    product.supplierId = supplier._id;
    await product.save();
    
    res.status(200).json({
      success: true,
      data: {
        supplierId: supplier._id,
        supplierName: supplier.name,
        productId: product._id,
        productName: product.name
      },
      message: 'Producto asociado al proveedor exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar producto de proveedor
// @route   DELETE /api/suppliers/:id/products/:productId
// @access  Private/Admin
exports.removeProductFromSupplier = async (req, res, next) => {
  try {
    const { id, productId } = req.params;
    
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }
    
    // Eliminar producto de la lista
    supplier.suppliedProducts = supplier.suppliedProducts.filter(
      p => p.toString() !== productId
    );
    await supplier.save();
    
    // Actualizar el producto para remover el supplierId
    const product = await Product.findById(productId);
    if (product && product.supplierId && product.supplierId.toString() === id) {
      product.supplierId = null;
      await product.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Producto desasociado del proveedor exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener proveedores destacados (top calificados)
// @route   GET /api/suppliers/top
// @access  Private
exports.getTopSuppliers = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const topSuppliers = await Supplier.getTopSuppliers(parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: topSuppliers,
      limit: parseInt(limit)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Buscar proveedores por producto
// @route   GET /api/suppliers/by-product/:productId
// @access  Private
exports.getSuppliersByProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    const suppliers = await Supplier.findByProduct(productId);
    
    res.status(200).json({
      success: true,
      data: suppliers,
      total: suppliers.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Registrar compra a proveedor
// @route   POST /api/suppliers/:id/purchase
// @access  Private/Admin
exports.recordPurchase = async (req, res, next) => {
  try {
    const { amount, updateDebt = false } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto debe ser mayor a 0'
      });
    }
    
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }
    
    // Registrar la compra
    await supplier.recordPurchase(amount);
    
    // Actualizar deuda si se solicita
    if (updateDebt) {
      await supplier.updateDebt(amount, 'increase');
    }
    
    res.status(200).json({
      success: true,
      data: {
        totalPurchases: supplier.totalPurchases,
        lastPurchase: supplier.lastPurchase,
        debt: supplier.debt
      },
      message: 'Compra registrada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar deuda del proveedor
// @route   PUT /api/suppliers/:id/debt
// @access  Private/Admin
exports.updateDebt = async (req, res, next) => {
  try {
    const { amount, type = 'increase' } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto debe ser mayor a 0'
      });
    }
    
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }
    
    await supplier.updateDebt(amount, type);
    
    res.status(200).json({
      success: true,
      data: {
        debt: supplier.debt
      },
      message: `Deuda ${type === 'increase' ? 'incrementada' : 'reducida'} exitosamente`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Estadísticas de proveedores
// @route   GET /api/suppliers/stats
// @access  Private
exports.getSupplierStats = async (req, res, next) => {
  try {
    const totalSuppliers = await Supplier.countDocuments();
    const activeSuppliers = await Supplier.countDocuments({ isActive: true });
    const inactiveSuppliers = totalSuppliers - activeSuppliers;
    
    // Calificación promedio
    const avgRating = await Supplier.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, average: { $avg: '$rating' } } }
    ]);
    
    // Distribución por condición fiscal
    const taxConditions = await Supplier.aggregate([
      { $group: { _id: '$taxCondition', count: { $sum: 1 } } }
    ]);
    
    // Distribución por condiciones de pago
    const paymentTermsDist = await Supplier.aggregate([
      { $group: { _id: '$paymentTerms', count: { $sum: 1 } } }
    ]);
    
    // Deuda total
    const totalDebt = await Supplier.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$debt' } } }
    ]);
    
    // Total compras acumulado
    const totalPurchasesAmount = await Supplier.aggregate([
      { $group: { _id: null, total: { $sum: '$totalPurchases' } } }
    ]);
    
    // Distribución por calificación
    const ratingDistribution = await Supplier.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        total: totalSuppliers,
        active: activeSuppliers,
        inactive: inactiveSuppliers,
        averageRating: avgRating[0]?.average || 0,
        taxConditions,
        paymentTerms: paymentTermsDist,
        totalDebt: totalDebt[0]?.total || 0,
        totalPurchases: totalPurchasesAmount[0]?.total || 0,
        ratingDistribution
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activar/Desactivar proveedor (toggle)
// @route   PATCH /api/suppliers/:id/toggle-status
// @access  Private/Admin
exports.toggleSupplierStatus = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }
    
    supplier.isActive = !supplier.isActive;
    await supplier.save();
    
    res.status(200).json({
      success: true,
      data: {
        isActive: supplier.isActive
      },
      message: `Proveedor ${supplier.isActive ? 'activado' : 'desactivado'} exitosamente`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener resumen financiero de proveedores
// @route   GET /api/suppliers/financial-summary
// @access  Private/Admin
exports.getFinancialSummary = async (req, res, next) => {
  try {
    // Proveedores con deuda
    const suppliersWithDebt = await Supplier.find({
      isActive: true,
      debt: { $gt: 0 }
    }).select('name debt totalPurchases rating').sort({ debt: -1 });
    
    // Total deuda por condición de pago
    const debtByPaymentTerms = await Supplier.aggregate([
      { $match: { isActive: true, debt: { $gt: 0 } } },
      { $group: { _id: '$paymentTerms', totalDebt: { $sum: '$debt' }, count: { $sum: 1 } } }
    ]);
    
    // Top 5 proveedores con mayor deuda
    const topDebtors = suppliersWithDebt.slice(0, 5);
    
    res.status(200).json({
      success: true,
      data: {
        totalDebt: suppliersWithDebt.reduce((sum, s) => sum + s.debt, 0),
        suppliersWithDebtCount: suppliersWithDebt.length,
        debtByPaymentTerms,
        topDebtors
      }
    });
  } catch (error) {
    next(error);
  }
};