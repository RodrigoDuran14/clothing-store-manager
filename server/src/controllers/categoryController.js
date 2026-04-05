const Category = require('../models/Category');
const Product = require('../models/Product');
const { filterObj, paginate, formatPagination } = require('../utils/helpers');

// @desc    Obtener todas las categorías
// @route   GET /api/categories
// @access  Private
exports.getCategories = async (req, res, next) => {
  try {
    const { pagina = 1, limite = 10, activo, tree, forSelect } = req.query;
    
    // Si solicita el árbol de categorías
    if (tree === 'true') {
      const categoryTree = await Category.getCategoryTree();
      return res.status(200).json({
        success: true,
        data: categoryTree
      });
    }
    
    // Si solicita para select (formularios)
    if (forSelect === 'true') {
      const options = await Category.getForSelect(activo === 'false');
      return res.status(200).json({
        success: true,
        data: options
      });
    }
    
    // Paginación normal
    const filter = {};
    if (activo !== undefined) filter.activo = activo === 'true';
    
    const { skip, limit, page } = paginate(pagina, limite);
    
    const categories = await Category.find(filter)
      .populate('padre_id', 'nombre nivel')
      .sort({ nivel: 1, orden: 1, nombre: 1 })
      .skip(skip)
      .limit(limit);
    
    // Contar subcategorías para cada categoría
    const categoriesWithCount = await Promise.all(categories.map(async (cat) => {
      const subcategoriasCount = await Category.countDocuments({ padre_id: cat._id });
      const productosCount = await Product.countDocuments({ categoria_id: cat._id, activo: true });
      
      return {
        ...cat.toObject(),
        subcategoriasCount,
        productosCount
      };
    }));
    
    const total = await Category.countDocuments(filter);
    const pagination = formatPagination(total, page, limit);
    
    res.status(200).json({
      success: true,
      data: categoriesWithCount,
      pagination
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener categoría por ID
// @route   GET /api/categories/:id
// @access  Private
exports.getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('padre_id', 'nombre nivel slug');
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Obtener subcategorías
    const subcategorias = await Category.find({ 
      padre_id: category._id, 
      activo: true 
    }).sort({ orden: 1, nombre: 1 });
    
    // Obtener breadcrumb
    const breadcrumb = await category.getBreadcrumb();
    
    res.status(200).json({
      success: true,
      data: {
        ...category.toObject(),
        subcategorias,
        breadcrumb
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear categoría
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res, next) => {
  try {
    const { nombre, descripcion, imagen, padre_id, orden, destacada, icono } = req.body;
    
    // Verificar si ya existe una categoría con el mismo nombre
    const existingCategory = await Category.findOne({ 
      nombre: nombre.toUpperCase() 
    });
    
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con este nombre'
      });
    }
    
    // Si tiene padre, verificar que exista
    if (padre_id) {
      const parent = await Category.findById(padre_id);
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: 'La categoría padre no existe'
        });
      }
      
      // Verificar nivel máximo
      if (parent.nivel >= 4) {
        return res.status(400).json({
          success: false,
          message: 'No se pueden crear más de 5 niveles de categorías'
        });
      }
    }
    
    const category = await Category.create({
      nombre: nombre.toUpperCase(),
      descripcion,
      imagen: imagen || 'https://via.placeholder.com/150',
      padre_id: padre_id || null,
      orden: orden || 0,
      destacada: destacada || false,
      icono: icono || ''
    });
    
    res.status(201).json({
      success: true,
      data: category,
      message: 'Categoría creada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar categoría
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res, next) => {
  try {
    const allowedFields = ['nombre', 'descripcion', 'imagen', 'padre_id', 'orden', 'activo', 'destacada', 'icono'];
    const filteredBody = filterObj(req.body, ...allowedFields);
    
    // Si está cambiando el nombre, verificar que no exista otra con el mismo
    if (filteredBody.nombre) {
      filteredBody.nombre = filteredBody.nombre.toUpperCase();
      const existingCategory = await Category.findOne({ 
        nombre: filteredBody.nombre,
        _id: { $ne: req.params.id }
      });
      
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra categoría con este nombre'
        });
      }
    }
    
    // Si cambia el padre, verificar que no se cree un ciclo
    if (filteredBody.padre_id) {
      // No puede ser su propio padre
      if (filteredBody.padre_id === req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Una categoría no puede ser padre de sí misma'
        });
      }
      
      // Verificar que el padre no sea un descendiente
      const category = await Category.findById(req.params.id);
      if (category) {
        const checkDescendant = async (parentId, targetId) => {
          if (!parentId) return false;
          if (parentId.toString() === targetId.toString()) return true;
          const parent = await Category.findById(parentId);
          return parent ? checkDescendant(parent.padre_id, targetId) : false;
        };
        
        const isDescendant = await checkDescendant(filteredBody.padre_id, req.params.id);
        if (isDescendant) {
          return res.status(400).json({
            success: false,
            message: 'No se puede asignar una subcategoría como padre'
          });
        }
      }
    }
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category,
      message: 'Categoría actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar categoría (soft delete)
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Verificar si tiene productos asociados
    const hasProducts = await category.hasProducts();
    if (hasProducts) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar la categoría porque tiene productos asociados'
      });
    }
    
    // Verificar si tiene subcategorías
    const hasSubcategories = await Category.countDocuments({ padre_id: category._id });
    if (hasSubcategories > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar la categoría porque tiene subcategorías'
      });
    }
    
    // Soft delete
    category.activo = false;
    await category.save();
    
    res.status(200).json({
      success: true,
      message: 'Categoría desactivada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar categoría permanentemente
// @route   DELETE /api/categories/:id/permanent
// @access  Private/Admin
exports.permanentDeleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Verificar si tiene productos asociados
    const hasProducts = await category.hasProducts();
    if (hasProducts) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar la categoría porque tiene productos asociados'
      });
    }
    
    // Verificar si tiene subcategorías
    const hasSubcategories = await Category.countDocuments({ padre_id: category._id });
    if (hasSubcategories > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar la categoría porque tiene subcategorías'
      });
    }
    
    await category.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Categoría eliminada permanentemente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reordenar categorías
// @route   PUT /api/categories/reorder
// @access  Private/Admin
exports.reorderCategories = async (req, res, next) => {
  try {
    const { categories } = req.body; // Array de { id, orden }
    
    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de categorías'
      });
    }
    
    for (const item of categories) {
      await Category.findByIdAndUpdate(item.id, { orden: item.orden });
    }
    
    res.status(200).json({
      success: true,
      message: 'Orden actualizado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Estadísticas de categorías
// @route   GET /api/categories/stats
// @access  Private
exports.getCategoryStats = async (req, res, next) => {
  try {
    const totalCategories = await Category.countDocuments();
    const activeCategories = await Category.countDocuments({ activo: true });
    const inactiveCategories = totalCategories - activeCategories;
    const destacadas = await Category.countDocuments({ destacada: true });
    
    // Categorías con más productos
    const categoriesWithProducts = await Category.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'categoria_id',
          as: 'productos'
        }
      },
      {
        $project: {
          nombre: 1,
          totalProductos: { $size: '$productos' }
        }
      },
      {
        $sort: { totalProductos: -1 }
      },
      {
        $limit: 5
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        total: totalCategories,
        activas: activeCategories,
        inactivas: inactiveCategories,
        destacadas,
        categoriasConMasProductos: categoriesWithProducts
      }
    });
  } catch (error) {
    next(error);
  }
};