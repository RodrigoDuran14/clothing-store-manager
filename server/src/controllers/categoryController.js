const Category = require('../models/Category');
const Product = require('../models/Product');
const { filterObj, paginate, formatPagination } = require('../utils/helpers');

// @desc    Obtener todas las categorías
// @route   GET /api/categories
// @access  Private
exports.getCategories = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, isActive, tree, forSelect } = req.query;
    
    // Si solicita el árbol de categorías (estructura jerárquica completa)
    if (tree === 'true') {
      const categoryTree = await Category.getCategoryTree();
      return res.status(200).json({
        success: true,
        data: categoryTree
      });
    }
    
    // Si solicita opciones para select (formularios con formato plano)
    if (forSelect === 'true') {
      const options = await Category.getForSelect(isActive === 'false');
      return res.status(200).json({
        success: true,
        data: options
      });
    }
    
    // Paginación normal de categorías
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    const categories = await Category.find(filter)
      .populate('parentId', 'name level slug')
      .sort({ level: 1, order: 1, name: 1 })
      .skip(skip)
      .limit(limitValue);
    
    // Contar subcategorías y productos para cada categoría
    const categoriesWithCount = await Promise.all(categories.map(async (cat) => {
      const subcategoriesCount = await Category.countDocuments({ parentId: cat._id });
      const productsCount = await Product.countDocuments({ categoryId: cat._id, isActive: true });
      
      return {
        ...cat.toObject(),
        subcategoriesCount,
        productsCount
      };
    }));
    
    const total = await Category.countDocuments(filter);
    const pagination = formatPagination(total, currentPage, limitValue);
    
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
      .populate('parentId', 'name level slug');
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Obtener subcategorías activas
    const subcategories = await Category.find({ 
      parentId: category._id, 
      isActive: true 
    }).sort({ order: 1, name: 1 });
    
    // Obtener breadcrumb (ruta de navegación)
    const breadcrumb = await category.getBreadcrumb();
    
    res.status(200).json({
      success: true,
      data: {
        ...category.toObject(),
        subcategories,
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
    const { name, description, image, parentId, order, isFeatured, icon } = req.body;
    
    // Verificar si ya existe una categoría con el mismo nombre
    const existingCategory = await Category.findOne({ 
      name: name.toUpperCase() 
    });
    
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con este nombre'
      });
    }
    
    // Si tiene padre, verificar que exista
    if (parentId) {
      const parent = await Category.findById(parentId);
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: 'La categoría padre no existe'
        });
      }
      
      // Verificar nivel máximo (5 niveles permitidos, level 0-4, máximo 4 como padre)
      if (parent.level >= 4) {
        return res.status(400).json({
          success: false,
          message: 'No se pueden crear más de 5 niveles de categorías'
        });
      }
    }
    
    const category = await Category.create({
      name: name.toUpperCase(),
      description,
      image: image || 'https://via.placeholder.com/150',
      parentId: parentId || null,
      order: order || 0,
      isFeatured: isFeatured || false,
      icon: icon || ''
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
    const allowedFields = ['name', 'description', 'image', 'parentId', 'order', 'isActive', 'isFeatured', 'icon'];
    const filteredBody = filterObj(req.body, ...allowedFields);
    
    // Si está cambiando el nombre, verificar que no exista otra con el mismo
    if (filteredBody.name) {
      filteredBody.name = filteredBody.name.toUpperCase();
      const existingCategory = await Category.findOne({ 
        name: filteredBody.name,
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
    if (filteredBody.parentId) {
      // No puede ser su propio padre
      if (filteredBody.parentId === req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Una categoría no puede ser padre de sí misma'
        });
      }
      
      // Verificar que el padre no sea un descendiente (evitar ciclos)
      const category = await Category.findById(req.params.id);
      if (category) {
        const checkDescendant = async (parentId, targetId) => {
          if (!parentId) return false;
          if (parentId.toString() === targetId.toString()) return true;
          const parent = await Category.findById(parentId);
          return parent ? checkDescendant(parent.parentId, targetId) : false;
        };
        
        const isDescendant = await checkDescendant(filteredBody.parentId, req.params.id);
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
    const hasSubcategories = await Category.countDocuments({ parentId: category._id });
    if (hasSubcategories > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar la categoría porque tiene subcategorías'
      });
    }
    
    // Soft delete - solo desactivar
    category.isActive = false;
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
    const hasSubcategories = await Category.countDocuments({ parentId: category._id });
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
    const { categories } = req.body; // Array de { id, order }
    
    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de categorías'
      });
    }
    
    // Actualizar el orden de cada categoría
    for (const item of categories) {
      await Category.findByIdAndUpdate(item.id, { order: item.order });
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
    const activeCategories = await Category.countDocuments({ isActive: true });
    const inactiveCategories = totalCategories - activeCategories;
    const featuredCategories = await Category.countDocuments({ isFeatured: true });
    
    // Categorías con más productos (top 5)
    const categoriesWithMostProducts = await Category.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'products'
        }
      },
      {
        $project: {
          name: 1,
          level: 1,
          totalProducts: { $size: '$products' }
        }
      },
      {
        $sort: { totalProducts: -1 }
      },
      {
        $limit: 5
      }
    ]);
    
    // Distribución por nivel
    const levelDistribution = await Category.aggregate([
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        total: totalCategories,
        active: activeCategories,
        inactive: inactiveCategories,
        featured: featuredCategories,
        categoriesWithMostProducts,
        levelDistribution
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener subcategorías de una categoría
// @route   GET /api/categories/:id/subcategories
// @access  Private
exports.getSubcategories = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    const subcategories = await Category.find({ 
      parentId: category._id,
      isActive: true 
    }).sort({ order: 1, name: 1 });
    
    res.status(200).json({
      success: true,
      data: subcategories,
      total: subcategories.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener breadcrumb de una categoría
// @route   GET /api/categories/:id/breadcrumb
// @access  Private
exports.getCategoryBreadcrumb = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    const breadcrumb = await category.getBreadcrumb();
    
    res.status(200).json({
      success: true,
      data: breadcrumb
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activar/Desactivar categoría
// @route   PATCH /api/categories/:id/toggle-status
// @access  Private/Admin
exports.toggleCategoryStatus = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    category.isActive = !category.isActive;
    await category.save();
    
    res.status(200).json({
      success: true,
      data: {
        isActive: category.isActive
      },
      message: `Categoría ${category.isActive ? 'activada' : 'desactivada'} exitosamente`
    });
  } catch (error) {
    next(error);
  }
};