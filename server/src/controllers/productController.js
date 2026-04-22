const Product = require('../models/Product');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const { generateUniqueBarcode } = require('../services/barcodeService');
const { filterObj, paginate, formatPagination } = require('../utils/helpers');

// @desc    Obtener todos los productos
// @route   GET /api/products
// @access  Private
exports.getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      categoryId,
      supplierId,
      isActive,
      isFeatured,
      lowStock,
      search,
      minPrice,
      maxPrice,
      minStock,
      isVisibleOnWeb
    } = req.query;
    
    // Construir filtro de búsqueda
    const filter = {};
    
    if (categoryId) filter.categoryId = categoryId;
    if (supplierId) filter.supplierId = supplierId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true';
    if (isVisibleOnWeb !== undefined) filter.isVisibleOnWeb = isVisibleOnWeb === 'true';
    
    // Filtro de precio
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    // Búsqueda por texto (usando índice text)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    let products = await Product.find(filter)
      .populate('categoryId', 'name slug')
      .populate('supplierId', 'name contact email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitValue);
    
    // Filtrar por stock bajo (si se solicita)
    if (lowStock === 'true') {
      products = products.filter(product => {
        return product.variants.some(v => v.stock <= v.minStock);
      });
    }
    
    // Filtrar por stock mínimo específico
    if (minStock !== undefined) {
      products = products.filter(product => {
        return product.variants.some(v => v.stock <= parseInt(minStock));
      });
    }
    
    // Agregar stock total a cada producto
    const productsWithStock = products.map(product => ({
      ...product.toObject(),
      totalStock: product.totalStock
    }));
    
    const total = await Product.countDocuments(filter);
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: productsWithStock,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener producto por ID
// @route   GET /api/products/:id
// @access  Private
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name description slug')
      .populate('supplierId', 'name contact phone email');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Agregar información adicional
    const productData = {
      ...product.toObject(),
      totalStock: product.totalStock,
      profitMargin: product.profitMargin
    };
    
    res.status(200).json({
      success: true,
      data: productData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Buscar producto por código de barras
// @route   GET /api/products/barcode/:barcode
// @access  Private
exports.getProductByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    
    const product = await Product.findOne({ barcode: barcode })
      .populate('categoryId', 'name')
      .populate('supplierId', 'name');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado para este código de barras'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...product.toObject(),
        totalStock: product.totalStock
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear producto
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      categoryId,
      supplierId,
      variants,
      price,
      webPrice,
      cost,
      images,
      isFeatured,
      isVisibleOnWeb,
      weightKg,
      tags,
      barcode
    } = req.body;
    
    // Verificar que la categoría exista
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'La categoría especificada no existe'
      });
    }
    
    // Verificar que el proveedor exista
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'El proveedor especificado no existe'
      });
    }
    
    // Generar código de barras único si no se proporcionó
    let finalBarcode = barcode;
    if (!finalBarcode) {
      finalBarcode = await generateUniqueBarcode();
    } else {
      // Verificar que el código de barras sea único
      const existingProduct = await Product.findOne({ barcode: finalBarcode });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un producto con este código de barras'
        });
      }
    }
    
    const product = await Product.create({
      name,
      description,
      categoryId,
      supplierId,
      variants: variants || [],
      price,
      webPrice: webPrice || price,
      cost,
      barcode: finalBarcode,
      images: images || [],
      isFeatured: isFeatured || false,
      isVisibleOnWeb: isVisibleOnWeb !== false,
      weightKg: weightKg || 0,
      tags: tags || []
    });
    
    res.status(201).json({
      success: true,
      data: {
        ...product.toObject(),
        totalStock: product.totalStock
      },
      message: 'Producto creado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar producto
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res, next) => {
  try {
    const allowedFields = [
      'name', 'description', 'categoryId', 'supplierId',
      'variants', 'price', 'webPrice', 'cost', 'images',
      'isActive', 'isFeatured', 'isVisibleOnWeb', 'weightKg', 'tags', 'barcode'
    ];
    
    const filteredBody = filterObj(req.body, ...allowedFields);
    
    // Si está actualizando el código de barras, verificar que sea único
    if (filteredBody.barcode) {
      const existingProduct = await Product.findOne({
        barcode: filteredBody.barcode,
        _id: { $ne: req.params.id }
      });
      
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro producto con este código de barras'
        });
      }
    }
    
    // Si actualiza categoría, verificar que exista
    if (filteredBody.categoryId) {
      const category = await Category.findById(filteredBody.categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'La categoría especificada no existe'
        });
      }
    }
    
    // Si actualiza proveedor, verificar que exista
    if (filteredBody.supplierId) {
      const supplier = await Supplier.findById(filteredBody.supplierId);
      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'El proveedor especificado no existe'
        });
      }
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    ).populate('categoryId supplierId');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...product.toObject(),
        totalStock: product.totalStock,
        profitMargin: product.profitMargin
      },
      message: 'Producto actualizado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar producto (soft delete)
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Soft delete - solo desactivar
    product.isActive = false;
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Producto desactivado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar stock de una variante
// @route   PUT /api/products/:id/stock
// @access  Private/Admin
exports.updateStock = async (req, res, next) => {
  try {
    const { size, color, quantity, type = 'adjustment' } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Verificar stock disponible para ventas
    if (type === 'sale') {
      const stockCheck = product.checkStock(size, color, quantity);
      if (!stockCheck.available) {
        return res.status(400).json({
          success: false,
          message: stockCheck.message,
          availableStock: stockCheck.availableStock
        });
      }
    }
    
    const updatedVariant = await product.updateStock(size, color, quantity, type);
    
    res.status(200).json({
      success: true,
      data: {
        productId: product._id,
        name: product.name,
        variant: updatedVariant,
        totalStock: product.totalStock
      },
      message: 'Stock actualizado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener productos con stock bajo
// @route   GET /api/products/low-stock
// @access  Private
exports.getLowStockProducts = async (req, res, next) => {
  try {
    const lowStock = await Product.getLowStockProducts();
    
    res.status(200).json({
      success: true,
      data: lowStock,
      total: lowStock.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Estadísticas de productos
// @route   GET /api/products/stats
// @access  Private
exports.getProductStats = async (req, res, next) => {
  try {
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const inactiveProducts = totalProducts - activeProducts;
    const featuredProducts = await Product.countDocuments({ isFeatured: true });
    const visibleOnWeb = await Product.countDocuments({ isVisibleOnWeb: true });
    
    // Obtener todos los productos activos para cálculos
    const products = await Product.find({ isActive: true });
    
    let totalStock = 0;
    let totalInventoryValue = 0;
    let totalSalesValue = 0;
    
    products.forEach(product => {
      product.variants.forEach(variant => {
        totalStock += variant.stock;
        totalInventoryValue += variant.stock * product.cost;
        totalSalesValue += variant.stock * product.price;
      });
    });
    
    const lowStockCount = await Product.getLowStockProducts();
    
    // Productos por categoría
    const productsByCategory = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      { $project: { categoryName: '$category.name', count: 1 } }
    ]);
    
    // Margen de ganancia promedio
    const averageProfitMargin = products.reduce((acc, product) => {
      return acc + product.profitMargin;
    }, 0) / (products.length || 1);
    
    res.status(200).json({
      success: true,
      data: {
        total: totalProducts,
        active: activeProducts,
        inactive: inactiveProducts,
        featured: featuredProducts,
        visibleOnWeb: visibleOnWeb,
        totalStock: totalStock,
        inventoryValue: totalInventoryValue,
        salesValue: totalSalesValue,
        potentialProfit: totalSalesValue - totalInventoryValue,
        lowStockProducts: lowStockCount.length,
        averageProfitMargin: averageProfitMargin.toFixed(2),
        productsByCategory
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verificar stock de una variante específica
// @route   GET /api/products/:id/check-stock
// @access  Private
exports.checkStock = async (req, res, next) => {
  try {
    const { size, color, quantity = 1 } = req.query;
    
    if (!size || !color) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere tamaño y color para verificar stock'
      });
    }
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    const stockCheck = product.checkStock(size, color, parseInt(quantity));
    
    res.status(200).json({
      success: true,
      data: stockCheck
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activar/Desactivar producto
// @route   PATCH /api/products/:id/toggle-status
// @access  Private/Admin
exports.toggleProductStatus = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    product.isActive = !product.isActive;
    await product.save();
    
    res.status(200).json({
      success: true,
      data: {
        isActive: product.isActive
      },
      message: `Producto ${product.isActive ? 'activado' : 'desactivado'} exitosamente`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Agregar imagen a producto
// @route   POST /api/products/:id/images
// @access  Private/Admin
exports.addProductImage = async (req, res, next) => {
  try {
    const { url, publicId, isMain } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'La URL de la imagen es requerida'
      });
    }
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Si esta imagen es principal, quitar el flag de otras imágenes
    if (isMain) {
      product.images.forEach(img => {
        img.isMain = false;
      });
    }
    
    product.images.push({
      url,
      publicId: publicId || '',
      isMain: isMain || false
    });
    
    await product.save();
    
    res.status(201).json({
      success: true,
      data: product.images,
      message: 'Imagen agregada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar imagen de producto
// @route   DELETE /api/products/:id/images/:imageId
// @access  Private/Admin
exports.deleteProductImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;
    
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Eliminar la imagen
    product.images = product.images.filter(img => img._id.toString() !== imageId);
    await product.save();
    
    res.status(200).json({
      success: true,
      data: product.images,
      message: 'Imagen eliminada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Establecer imagen principal
// @route   PUT /api/products/:id/images/:imageId/main
// @access  Private/Admin
exports.setMainImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;
    
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Quitar flag de todas las imágenes
    product.images.forEach(img => {
      img.isMain = false;
    });
    
    // Establecer la imagen seleccionada como principal
    const image = product.images.id(imageId);
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }
    
    image.isMain = true;
    await product.save();
    
    res.status(200).json({
      success: true,
      data: product.images,
      message: 'Imagen principal actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};