const mongoose = require('mongoose');

// Esquema para variantes de producto (talle, color, stock)
const variantSchema = new mongoose.Schema({
  size: {  // Talle
    type: String,
    required: [true, 'Size is required'],
    trim: true,
    uppercase: true
  },
  color: {  // Color
    type: String,
    required: [true, 'Color is required'],
    trim: true
  },
  colorCode: {  // Código hexadecimal del color (opcional)
    type: String,
    trim: true,
    default: ''
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  minStock: {  // Stock mínimo para alertas
    type: Number,
    default: 5,
    min: [0, 'Minimum stock cannot be negative']
  },
  sku: {  // Stock Keeping Unit
    type: String,
    unique: true,
    sparse: true
  }
});

const productSchema = new mongoose.Schema({
  name: {  // Nombre del producto
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters'],
    index: true
  },
  description: {  // Descripción
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  categoryId: {  // ID de categoría
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  supplierId: {  // ID de proveedor
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier is required']
  },
  partnerId: {  // Socio dueño de este producto (override de categoría)
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Partner',
  default: null
  },
  variants: [variantSchema],  // Variantes del producto
  price: {  // Precio de venta
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  webPrice: {  // Precio para ecommerce
    type: Number,
    min: [0, 'Web price cannot be negative'],
    default: function() {
      return this.price;
    }
  },
  cost: {  // Costo del producto
    type: Number,
    required: [true, 'Cost is required'],
    min: [0, 'Cost cannot be negative']
  },
  barcode: {  // Código de barras
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  images: [{  // Imágenes del producto
    url: String,
    publicId: String,
    isMain: {  // Si es la imagen principal
      type: Boolean,
      default: false
    }
  }],
  isActive: {  // Si el producto está activo
    type: Boolean,
    default: true
  },
  isFeatured: {  // Si es producto destacado
    type: Boolean,
    default: false
  },
  isVisibleOnWeb: {  // Visible en ecommerce
    type: Boolean,
    default: true
  },
  weightKg: {  // Peso en kilogramos
    type: Number,
    default: 0,
    min: 0
  },
  tags: [{  // Etiquetas para búsqueda
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para búsquedas rápidas
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ categoryId: 1 });
productSchema.index({ supplierId: 1 });
productSchema.index({ 'variants.sku': 1 });
productSchema.index({ barcode: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1, isVisibleOnWeb: 1 });

// Virtual: stock total sumando todas las variantes
productSchema.virtual('totalStock').get(function() {
  if (!this.variants || this.variants.length === 0) return 0;
  return this.variants.reduce((total, variant) => total + variant.stock, 0);
});

// Virtual: margen de ganancia porcentual
productSchema.virtual('profitMargin').get(function() {
  if (this.cost === 0) return 100;
  return ((this.price - this.cost) / this.cost) * 100;
});

// Middleware: actualizar fecha antes de guardar
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Generar SKU automático para variantes si no tienen
  if (this.variants && this.variants.length > 0) {
    this.variants.forEach((variant, index) => {
      if (!variant.sku) {
        const nameAbbr = this.name.substring(0, 3).toUpperCase();
        const sizeAbbr = variant.size.substring(0, 2).toUpperCase();
        const colorAbbr = variant.color.substring(0, 3).toUpperCase();
        variant.sku = `${nameAbbr}-${sizeAbbr}-${colorAbbr}-${index + 1}`;
      }
    });
  }
  
  next();
});

// Método: verificar stock de una variante específica
productSchema.methods.checkStock = function(size, color, quantity) {
  const variant = this.variants.find(
    v => v.size === size && v.color === color
  );
  
  if (!variant) {
    return { available: false, message: 'Variant not found' };
  }
  
  if (variant.stock < quantity) {
    return { 
      available: false, 
      message: `Insufficient stock. Available: ${variant.stock}`,
      availableStock: variant.stock
    };
  }
  
  return { available: true, availableStock: variant.stock };
};

// Método: actualizar stock
productSchema.methods.updateStock = async function(size, color, quantity, type = 'sale') {
  const variant = this.variants.find(
    v => v.size === size && v.color === color
  );
  
  if (!variant) {
    throw new Error('Variant not found');
  }
  
  if (type === 'sale' && variant.stock < quantity) {
    throw new Error(`Insufficient stock for ${this.name} - Size: ${size}, Color: ${color}`);
  }
  
  // Actualizar stock según el tipo de operación
  if (type === 'sale') {
    variant.stock -= quantity;
  } else if (type === 'purchase' || type === 'return') {
    variant.stock += quantity;
  } else if (type === 'adjustment') {
    variant.stock = quantity;
  }
  
  await this.save();
  return variant;
};

// Método estático: buscar por código de barras
productSchema.statics.findByBarcode = function(barcode) {
  return this.findOne({ barcode: barcode });
};

// Método estático: obtener productos con stock bajo
productSchema.statics.getLowStockProducts = async function() {
  const products = await this.find({ isActive: true });
  
  const lowStock = [];
  for (const product of products) {
    for (const variant of product.variants) {
      if (variant.stock <= variant.minStock) {
        lowStock.push({
          productId: product._id,
          name: product.name,
          size: variant.size,
          color: variant.color,
          stock: variant.stock,
          minStock: variant.minStock,
          sku: variant.sku
        });
      }
    }
  }
  
  return lowStock;
};

module.exports = mongoose.model('Product', productSchema);