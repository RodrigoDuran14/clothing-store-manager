const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre de la categoría es obligatorio'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [200, 'La descripción no puede exceder 200 caracteres']
  },
  imagen: {
    type: String,
    default: 'https://via.placeholder.com/150'
  },
  padre_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  nivel: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  orden: {
    type: Number,
    default: 0
  },
  activo: {
    type: Boolean,
    default: true
  },
  destacada: {
    type: Boolean,
    default: false
  },
  icono: {
    type: String,
    default: '' // Clase de icono (FontAwesome, Material Icons, etc.)
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para búsquedas rápidas
categorySchema.index({ nombre: 1 });
categorySchema.index({ padre_id: 1 });
categorySchema.index({ nivel: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ activo: 1 });

// Virtual: subcategorías
categorySchema.virtual('subcategorias', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'padre_id'
});

// Virtual: ruta completa
categorySchema.virtual('rutaCompleta').get(function() {
  return `/${this.slug}`;
});

// Middleware: generar slug antes de guardar
categorySchema.pre('save', function(next) {
  if (this.isModified('nombre')) {
    this.slug = this.nombre
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
  if (this.padre_id && this.padre_id.equals(this._id)) {
    next(new Error('Una categoría no puede ser padre de sí misma'));
  }
  
  // Calcular nivel basado en el padre
  if (this.padre_id) {
    const parent = await mongoose.model('Category').findById(this.padre_id);
    if (parent) {
      this.nivel = parent.nivel + 1;
      if (this.nivel > 5) {
        next(new Error('Máximo 5 niveles de profundidad permitidos'));
      }
    }
  } else {
    this.nivel = 0;
  }
  
  next();
});

// Método estático: obtener árbol de categorías
categorySchema.statics.getCategoryTree = async function() {
  const categories = await this.find({ activo: true }).sort({ orden: 1, nombre: 1 });
  
  const buildTree = (parentId = null) => {
    return categories
      .filter(cat => {
        if (parentId === null) {
          return !cat.padre_id;
        }
        return cat.padre_id && cat.padre_id.toString() === parentId.toString();
      })
      .map(cat => ({
        ...cat.toObject(),
        subcategorias: buildTree(cat._id)
      }));
  };
  
  return buildTree();
};

// Método estático: obtener categorías para select (formularios)
categorySchema.statics.getForSelect = async function(includeInactive = false) {
  const filter = includeInactive ? {} : { activo: true };
  const categories = await this.find(filter).sort({ nivel: 1, orden: 1, nombre: 1 });
  
  const formatOptions = (items, prefix = '') => {
    const options = [];
    for (const cat of items) {
      options.push({
        value: cat._id,
        label: `${prefix}${cat.nombre}`,
        nivel: cat.nivel,
        activo: cat.activo
      });
      
      if (cat.subcategorias && cat.subcategorias.length > 0) {
        options.push(...formatOptions(cat.subcategorias, `${prefix}-- `));
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
  const count = await Product.countDocuments({ categoria_id: this._id, activo: true });
  return count > 0;
};

// Método de instancia: obtener ruta completa (breadcrumb)
categorySchema.methods.getBreadcrumb = async function() {
  const breadcrumb = [{
    _id: this._id,
    nombre: this.nombre,
    slug: this.slug
  }];
  
  if (this.padre_id) {
    const parent = await mongoose.model('Category').findById(this.padre_id);
    if (parent) {
      const parentBreadcrumb = await parent.getBreadcrumb();
      return [...parentBreadcrumb, ...breadcrumb];
    }
  }
  
  return breadcrumb;
};

module.exports = mongoose.model('Category', categorySchema);