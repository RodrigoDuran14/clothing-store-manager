const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {  // Nombre de la categoría
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  description: {  // Descripción
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  image: {  // URL de la imagen
    type: String,
    default: 'https://via.placeholder.com/150'
  },
  parentId: {  // ID de categoría padre (para subcategorías)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {  // Nivel en el árbol (0 = raíz)
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  order: {  // Orden de visualización
    type: Number,
    default: 0
  },
  isActive: {  // Si está activa
    type: Boolean,
    default: true
  },
  isFeatured: {  // Si es destacada
    type: Boolean,
    default: false
  },
  icon: {  // Clase de icono (FontAwesome, Material Icons, etc.)
    type: String,
    default: ''
  },
  slug: {  // URL amigable
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  partnerId: {  // Socio dueño de esta categoría
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Partner',
  default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para búsquedas rápidas
categorySchema.index({ name: 1 });
categorySchema.index({ parentId: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1 });

// Virtual: subcategorías
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId'
});

// Virtual: ruta completa
categorySchema.virtual('fullPath').get(function() {
  return `/${this.slug}`;
});

// Middleware: generar slug antes de guardar
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Middleware: validar que no se pueda crear una categoría padre de sí misma
categorySchema.pre('save', async function(next) {
  if (this.parentId && this.parentId.equals(this._id)) {
    next(new Error('A category cannot be its own parent'));
  }
  
  // Calcular nivel basado en el padre
  if (this.parentId) {
    const parent = await mongoose.model('Category').findById(this.parentId);
    if (parent) {
      this.level = parent.level + 1;
      if (this.level > 5) {
        next(new Error('Maximum 5 levels of depth allowed'));
      }
    }
  } else {
    this.level = 0;
  }
  
  next();
});

// Método estático: obtener árbol de categorías
categorySchema.statics.getCategoryTree = async function() {
  const categories = await this.find({ isActive: true }).sort({ order: 1, name: 1 });
  
  const buildTree = (parentId = null) => {
    return categories
      .filter(cat => {
        if (parentId === null) {
          return !cat.parentId;
        }
        return cat.parentId && cat.parentId.toString() === parentId.toString();
      })
      .map(cat => ({
        ...cat.toObject(),
        children: buildTree(cat._id)
      }));
  };
  
  return buildTree();
};

// Método estático: obtener categorías para select (formularios)
categorySchema.statics.getForSelect = async function(includeInactive = false) {
  const filter = includeInactive ? {} : { isActive: true };
  const categories = await this.find(filter).sort({ level: 1, order: 1, name: 1 });
  
  const formatOptions = (items, prefix = '') => {
    const options = [];
    for (const cat of items) {
      options.push({
        value: cat._id,
        label: `${prefix}${cat.name}`,
        level: cat.level,
        isActive: cat.isActive
      });
      
      if (cat.subcategories && cat.subcategories.length > 0) {
        options.push(...formatOptions(cat.subcategories, `${prefix}-- `));
      }
    }
    return options;
  };
  
  const tree = await this.getCategoryTree();
  return formatOptions(tree);
};

// Método de instancia: verificar si tiene productos asociados
categorySchema.methods.hasProducts = async function() {
  const Product = mongoose.model('Product');
  const count = await Product.countDocuments({ categoryId: this._id, isActive: true });
  return count > 0;
};

// Método de instancia: obtener ruta completa (breadcrumb)
categorySchema.methods.getBreadcrumb = async function() {
  const breadcrumb = [{
    _id: this._id,
    name: this.name,
    slug: this.slug
  }];
  
  if (this.parentId) {
    const parent = await mongoose.model('Category').findById(this.parentId);
    if (parent) {
      const parentBreadcrumb = await parent.getBreadcrumb();
      return [...parentBreadcrumb, ...breadcrumb];
    }
  }
  
  return breadcrumb;
};

module.exports = mongoose.model('Category', categorySchema);