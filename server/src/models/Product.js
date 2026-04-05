const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  talle: {
    type: String,
    required: [true, 'El talle es obligatorio'],
    trim: true,
    uppercase: true
  },
  color: {
    type: String,
    required: [true, 'El color es obligatorio'],
    trim: true
  },
  colorCodigo: {
    type: String,
    trim: true,
    default: '' // Código hexadecimal del color (opcional)
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'El stock no puede ser negativo']
  },
  stockMinimo: {
    type: Number,
    default: 5,
    min: [0, 'El stock mínimo no puede ser negativo']
  },
  sku: {
    type: String,
    unique: true,
    sparse: true // Permite valores null
  }
});

const productSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del producto es obligatorio'],
    trim: true,
    maxlength: [200, 'El nombre no puede exceder 200 caracteres'],
    index: true
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [2000, 'La descripción no puede exceder 2000 caracteres']
  },
  categoria_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'La categoría es obligatoria']
  },
  proveedor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'El proveedor es obligatorio']
  },
  variantes: [variantSchema],
  precio: {
    type: Number,
    required: [true, 'El precio es obligatorio'],
    min: [0, 'El precio no puede ser negativo']
  },
  precioWeb: {
    type: Number,
    min: [0, 'El precio web no puede ser negativo'],
    default: function() {
      return this.precio; // Por defecto igual al precio normal
    }
  },
  costo: {
    type: Number,
    required: [true, 'El costo es obligatorio'],
    min: [0, 'El costo no puede ser negativo']
  },
  codigo_barra: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  imagenes: [{
    url: String,
    public_id: String,
    principal: {
      type: Boolean,
      default: false
    }
  }],
  activo: {
    type: Boolean,
    default: true
  },
  destacado: {
    type: Boolean,
    default: false
  },
  visibleWeb: {
    type: Boolean,
    default: true
  },
  pesoKg: {
    type: Number,
    default: 0,
    min: 0
  },
  etiquetas: [{
    type: String,
    trim: true
  }],
  fecha_creacion: {
    type: Date,
    default: Date.now
  },
  ultimaActualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para búsquedas rápidas
productSchema.index({ nombre: 'text', descripcion: 'text' });
productSchema.index({ categoria_id: 1 });
productSchema.index({ proveedor_id: 1 });
productSchema.index({ 'variantes.sku': 1 });
productSchema.index({ codigo_barra: 1 });
productSchema.index({ precio: 1 });
productSchema.index({ activo: 1, visibleWeb: 1 });

// Virtual: stock total sumando todas las variantes
productSchema.virtual('stockTotal').get(function() {
  if (!this.variantes || this.variantes.length === 0) return 0;
  return this.variantes.reduce((total, variante) => total + variante.stock, 0);
});

// Virtual: margen de ganancia
productSchema.virtual('margenGanancia').get(function() {
  if (this.costo === 0) return 100;
  return ((this.precio - this.costo) / this.costo) * 100;
});

// Middleware: actualizar fecha antes de guardar
productSchema.pre('save', function(next) {
  this.ultimaActualizacion = Date.now();
  
  // Generar SKU automático para variantes si no tienen
  if (this.variantes && this.variantes.length > 0) {
    this.variantes.forEach((variante, index) => {
      if (!variante.sku) {
        const nombreAbrev = this.nombre.substring(0, 3).toUpperCase();
        const talleAbrev = variante.talle.substring(0, 2).toUpperCase();
        const colorAbrev = variante.color.substring(0, 3).toUpperCase();
        variante.sku = `${nombreAbrev}-${talleAbrev}-${colorAbrev}-${index + 1}`;
      }
    });
  }
  
  next();
});

// Método para verificar stock de una variante específica
productSchema.methods.checkStock = function(talle, color, cantidad) {
  const variante = this.variantes.find(
    v => v.talle === talle && v.color === color
  );
  
  if (!variante) {
    return { disponible: false, mensaje: 'Variante no encontrada' };
  }
  
  if (variante.stock < cantidad) {
    return { 
      disponible: false, 
      mensaje: `Stock insuficiente. Disponible: ${variante.stock}`,
      stockDisponible: variante.stock
    };
  }
  
  return { disponible: true, stockDisponible: variante.stock };
};

// Método para actualizar stock
productSchema.methods.updateStock = async function(talle, color, cantidad, tipo = 'venta') {
  const variante = this.variantes.find(
    v => v.talle === talle && v.color === color
  );
  
  if (!variante) {
    throw new Error('Variante no encontrada');
  }
  
  if (tipo === 'venta' && variante.stock < cantidad) {
    throw new Error(`Stock insuficiente para ${this.nombre} - Talle: ${talle}, Color: ${color}`);
  }
  
  // Actualizar stock
  if (tipo === 'venta') {
    variante.stock -= cantidad;
  } else if (tipo === 'compra' || tipo === 'devolucion') {
    variante.stock += cantidad;
  } else if (tipo === 'ajuste') {
    variante.stock = cantidad;
  }
  
  await this.save();
  return variante;
};

// Método estático para buscar por código de barras
productSchema.statics.findByBarcode = function(codigoBarra) {
  return this.findOne({ codigo_barra: codigoBarra });
};

// Método para obtener productos con stock bajo
productSchema.statics.getLowStockProducts = async function() {
  const products = await this.find({ activo: true });
  
  const lowStock = [];
  for (const product of products) {
    for (const variante of product.variantes) {
      if (variante.stock <= variante.stockMinimo) {
        lowStock.push({
          productId: product._id,
          nombre: product.nombre,
          talle: variante.talle,
          color: variante.color,
          stock: variante.stock,
          stockMinimo: variante.stockMinimo,
          sku: variante.sku
        });
      }
    }
  }
  
  return lowStock;
};

module.exports = mongoose.model('Product', productSchema);