const Product = require('../models/Product');
const { generateUniqueBarcode, validateBarcode } = require('../services/barcodeService');
const { filterObj, paginate, formatPagination } = require('../utils/helpers');

// @desc    Obtener todos los productos
// @route   GET /api/products
// @access  Private
exports.getProducts = async (req, res, next) => {
  try {
    const {
      pagina = 1,
      limite = 10,
      categoria,
      proveedor,
      activo,
      destacado,
      stockBajo,
      search,
      minPrecio,
      maxPrecio
    } = req.query;
    
    const filter = {};
    
    if (categoria) filter.categoria_id = categoria;
    if (proveedor) filter.proveedor_id = proveedor;
    if (activo !== undefined) filter.activo = activo === 'true';
    if (destacado !== undefined) filter.destacado = destacado === 'true';
    
    // Filtro de precio
    if (minPrecio || maxPrecio) {
      filter.precio = {};
      if (minPrecio) filter.precio.$gte = parseFloat(minPrecio);
      if (maxPrecio) filter.precio.$lte = parseFloat(maxPrecio);
    }
    
    // Búsqueda por texto
    if (search) {
      filter.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { descripcion: { $regex: search, $options: 'i' } },
        { etiquetas: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    const { skip, limit, page } = paginate(pagina, limite);
    
    let products = await Product.find(filter)
      .populate('categoria_id', 'nombre')
      .populate('proveedor_id', 'nombre contacto')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Filtrar por stock bajo (si se solicita)
    if (stockBajo === 'true') {
      products = products.filter(product => {
        return product.variantes.some(v => v.stock <= v.stockMinimo);
      });
    }
    
    const total = await Product.countDocuments(filter);
    const pagination = formatPagination(total, page, limit);
    
    res.status(200).json({
      success: true,
      data: products,
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
      .populate('categoria_id', 'nombre descripcion')
      .populate('proveedor_id', 'nombre contacto telefono email');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Buscar producto por código de barras
// @route   GET /api/products/barcode/:codigo
// @access  Private
exports.getProductByBarcode = async (req, res, next) => {
  try {
    const { codigo } = req.params;
    
    const product = await Product.findOne({ codigo_barra: codigo })
      .populate('categoria_id', 'nombre')
      .populate('proveedor_id', 'nombre');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado para este código de barras'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
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
      nombre,
      descripcion,
      categoria_id,
      proveedor_id,
      variantes,
      precio,
      precioWeb,
      costo,
      imagenes,
      destacado,
      visibleWeb,
      pesoKg,
      etiquetas
    } = req.body;
    
    // Generar código de barras único
    const codigo_barra = await generateUniqueBarcode();
    
    const product = await Product.create({
      nombre,
      descripcion,
      categoria_id,
      proveedor_id,
      variantes: variantes || [],
      precio,
      precioWeb: precioWeb || precio,
      costo,
      codigo_barra,
      imagenes: imagenes || [],
      destacado: destacado || false,
      visibleWeb: visibleWeb !== false,
      pesoKg: pesoKg || 0,
      etiquetas: etiquetas || []
    });
    
    res.status(201).json({
      success: true,
      data: product,
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
      'nombre', 'descripcion', 'categoria_id', 'proveedor_id',
      'variantes', 'precio', 'precioWeb', 'costo', 'imagenes',
      'activo', 'destacado', 'visibleWeb', 'pesoKg', 'etiquetas'
    ];
    
    const filteredBody = filterObj(req.body, ...allowedFields);
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    ).populate('categoria_id proveedor_id');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product,
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
    
    // Soft delete
    product.activo = false;
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
    const { talle, color, cantidad, tipo = 'ajuste' } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    const varianteActualizada = await product.updateStock(talle, color, cantidad, tipo);
    
    res.status(200).json({
      success: true,
      data: {
        productId: product._id,
        nombre: product.nombre,
        variante: varianteActualizada,
        stockTotal: product.stockTotal
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
    const activeProducts = await Product.countDocuments({ activo: true });
    const inactiveProducts = totalProducts - activeProducts;
    
    const products = await Product.find({ activo: true });
    
    let totalStock = 0;
    let totalValue = 0;
    
    products.forEach(product => {
      product.variantes.forEach(variante => {
        totalStock += variante.stock;
        totalValue += variante.stock * product.costo;
      });
    });
    
    const lowStockCount = await Product.getLowStockProducts();
    
    res.status(200).json({
      success: true,
      data: {
        total: totalProducts,
        activos: activeProducts,
        inactivos: inactiveProducts,
        stockTotal: totalStock,
        valorInventario: totalValue,
        productosStockBajo: lowStockCount.length
      }
    });
  } catch (error) {
    next(error);
  }
};