const mongoose = require('mongoose');

// Esquema para socios del negocio
const partnerSchema = new mongoose.Schema({
  name: {  // Nombre del socio
    type: String,
    required: [true, 'Partner name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  document: {  // CUIT/CUIL
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  ownershipPercentage: {  // Porcentaje de propiedad
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 50
  },
  // Categorías que pertenecen a este socio
  ownedCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  // Productos específicos de este socio (si no es por categoría)
  ownedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  // Cuentas bancarias del socio
  bankAccounts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  }],
  // Caja del socio
  cashRegisterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PartnerCashRegister'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  userId: {  // Usuario asociado (si tiene acceso al sistema)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    sparse: true
  },
  notes: String
}, {
  timestamps: true
});

// Índices
partnerSchema.index({ name: 1 });
partnerSchema.index({ email: 1 });
partnerSchema.index({ ownedCategories: 1 });
partnerSchema.index({ ownedProducts: 1 });

// Virtual: nombre completo
partnerSchema.virtual('fullName').get(function() {
  return this.name;
});

// Método: obtener productos de este socio
partnerSchema.methods.getOwnedProducts = async function() {
  const Product = mongoose.model('Product');
  
  let products = [];
  
  // Productos por categoría
  if (this.ownedCategories && this.ownedCategories.length > 0) {
    const categoryProducts = await Product.find({
      categoryId: { $in: this.ownedCategories },
      isActive: true
    });
    products.push(...categoryProducts);
  }
  
  // Productos específicos
  if (this.ownedProducts && this.ownedProducts.length > 0) {
    const specificProducts = await Product.find({
      _id: { $in: this.ownedProducts },
      isActive: true
    });
    products.push(...specificProducts);
  }
  
  // Eliminar duplicados
  const uniqueProducts = [];
  const productIds = new Set();
  for (const product of products) {
    if (!productIds.has(product._id.toString())) {
      productIds.add(product._id.toString());
      uniqueProducts.push(product);
    }
  }
  
  return uniqueProducts;
};

// Método: verificar si un producto pertenece a este socio
partnerSchema.methods.ownsProduct = async function(productId) {
  const Product = mongoose.model('Product');
  const product = await Product.findById(productId);
  
  if (!product) return false;
  
  // Verificar por categoría
  if (this.ownedCategories && this.ownedCategories.length > 0) {
    if (this.ownedCategories.some(cat => cat.toString() === product.categoryId?.toString())) {
      return true;
    }
  }
  
  // Verificar por producto específico
  if (this.ownedProducts && this.ownedProducts.length > 0) {
    if (this.ownedProducts.some(pid => pid.toString() === productId)) {
      return true;
    }
  }
  
  return false;
};

// Método estático: obtener socio por categoría
partnerSchema.statics.findByCategory = async function(categoryId) {
  return this.findOne({
    ownedCategories: categoryId,
    isActive: true
  });
};

// Método estático: obtener socio por producto
partnerSchema.statics.findByProduct = async function(productId) {
  const product = await mongoose.model('Product').findById(productId);
  if (!product) return null;
  
  // Buscar por categoría del producto
  if (product.categoryId) {
    const partnerByCategory = await this.findOne({
      ownedCategories: product.categoryId,
      isActive: true
    });
    if (partnerByCategory) return partnerByCategory;
  }
  
  // Buscar por producto específico
  return this.findOne({
    ownedProducts: productId,
    isActive: true
  });
};

module.exports = mongoose.model('Partner', partnerSchema);