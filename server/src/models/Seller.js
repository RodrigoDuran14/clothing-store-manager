const mongoose = require('mongoose');

// Esquema para el turno de trabajo
const shiftSchema = new mongoose.Schema({
  day: {  // Día de la semana
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },
  startTime: {  // Hora de inicio (formato HH:MM)
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
  },
  endTime: {  // Hora de fin (formato HH:MM)
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
  },
  active: {
    type: Boolean,
    default: true
  }
});

// Esquema para el historial de comisiones
const commissionHistorySchema = new mongoose.Schema({
  period: {  // Período (ej: "2024-01")
    type: String,
    required: true
  },
  totalSales: {  // Total de ventas en el período
    type: Number,
    required: true,
    min: 0
  },
  commissionAmount: {  // Monto de comisión ganada
    type: Number,
    required: true,
    min: 0
  },
  commissionRate: {  // Tasa de comisión aplicada
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  paid: {  // Si ya se pagó la comisión
    type: Boolean,
    default: false
  },
  paidDate: {  // Fecha de pago
    type: Date
  },
  paymentReference: {  // Referencia del pago
    type: String
  },
  notes: String
}, {
  timestamps: true
});

const sellerSchema = new mongoose.Schema({
  // Información personal
  firstName: {  // Nombre
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {  // Apellido
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },
  phone: {  // Teléfono
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9+\-\s()]{8,20}$/, 'Invalid phone number']
  },
  phone2: {  // Teléfono alternativo
    type: String,
    trim: true,
    match: [/^[0-9+\-\s()]{8,20}$/, 'Invalid phone number']
  },
  document: {  // Documento de identidad (DNI, CUIT, etc.)
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  documentType: {  // Tipo de documento
    type: String,
    enum: ['DNI', 'CUIL', 'CUIT', 'PASSPORT', 'OTHER'],
    default: 'DNI'
  },
  birthDate: {  // Fecha de nacimiento
    type: Date
  },
  address: {  // Dirección
    street: String,
    number: String,
    apartment: String,
    city: String,
    province: String,
    zipCode: String
  },
  
  // Información laboral
  employeeId: {  // ID de empleado (interno)
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  position: {  // Puesto/Cargo
    type: String,
    enum: ['salesperson', 'senior_salesperson', 'supervisor', 'manager'],
    default: 'salesperson'
  },
  hireDate: {  // Fecha de contratación
    type: Date,
    default: Date.now
  },
  terminationDate: {  // Fecha de despido/renuncia
    type: Date
  },
  active: {
    type: Boolean,
    default: true
  },
  
  // Configuración de comisiones
  commissionRate: {  // Tasa base de comisión (%)
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 5
  },
  commissionType: {  // Tipo de comisión
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  fixedCommissionAmount: {  // Monto fijo por venta (si aplica)
    type: Number,
    min: 0,
    default: 0
  },
  commissionTiers: [{  // Escalas de comisión por volumen
    minSales: { type: Number, required: true },
    maxSales: { type: Number },
    rate: { type: Number, required: true, min: 0, max: 100 }
  }],
  
  // Turnos de trabajo
  shifts: [shiftSchema],
  
  // Métricas de rendimiento
  totalSales: {  // Total de ventas acumulado
    type: Number,
    default: 0,
    min: 0
  },
  totalCommission: {  // Total de comisiones acumuladas
    type: Number,
    default: 0,
    min: 0
  },
  monthlySales: {  // Ventas del mes actual
    type: Number,
    default: 0
  },
  lastSaleDate: {  // Fecha de la última venta
    type: Date
  },
  salesCount: {  // Número total de ventas
    type: Number,
    default: 0
  },
  
  // Historial de comisiones
  commissionHistory: [commissionHistorySchema],
  
  // Notas adicionales
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  
  // Usuario asociado (si tiene acceso al sistema)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    sparse: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para búsquedas rápidas
sellerSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });
sellerSchema.index({ email: 1 });
sellerSchema.index({ employeeId: 1 });
sellerSchema.index({ document: 1 });
sellerSchema.index({ active: 1 });
sellerSchema.index({ totalSales: -1 });
sellerSchema.index({ commissionRate: 1 });
sellerSchema.index({ position: 1 });

// Virtual: nombre completo
sellerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual: edad
sellerSchema.virtual('age').get(function() {
  if (!this.birthDate) return null;
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual: ventas del último mes
sellerSchema.virtual('lastMonthSales').get(function() {
  // Este valor debe ser calculado mediante agregación
  // Por ahora retorna monthlySales
  return this.monthlySales;
});

// Método estático: obtener vendedor por usuario asociado
sellerSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId, active: true });
};

// Método estático: obtener top vendedores
sellerSchema.statics.getTopSellers = async function(limit = 10, period = 'monthly') {
  const sortField = period === 'monthly' ? 'monthlySales' : 'totalSales';
  return this.find({ active: true })
    .sort({ [sortField]: -1 })
    .limit(limit)
    .select('firstName lastName totalSales monthlySales commissionRate position');
};

// Método estático: calcular comisiones por período
sellerSchema.statics.calculateCommissionsForPeriod = async function(startDate, endDate) {
  const Sale = mongoose.model('Sale');
  
  const sales = await Sale.aggregate([
    {
      $match: {
        sellerId: { $exists: true },
        date: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$sellerId',
        totalSales: { $sum: '$total' },
        salesCount: { $sum: 1 }
      }
    }
  ]);
  
  const commissions = [];
  for (const sale of sales) {
    const seller = await this.findById(sale._id);
    if (seller) {
      let commissionAmount = 0;
      
      if (seller.commissionType === 'percentage') {
        // Verificar si aplica escala por volumen
        if (seller.commissionTiers && seller.commissionTiers.length > 0) {
          const tier = seller.commissionTiers.find(
            t => sale.totalSales >= t.minSales && (!t.maxSales || sale.totalSales <= t.maxSales)
          );
          commissionAmount = sale.totalSales * (tier ? tier.rate : seller.commissionRate) / 100;
        } else {
          commissionAmount = sale.totalSales * seller.commissionRate / 100;
        }
      } else {
        commissionAmount = seller.fixedCommissionAmount * sale.salesCount;
      }
      
      commissions.push({
        sellerId: seller._id,
        sellerName: seller.fullName,
        totalSales: sale.totalSales,
        salesCount: sale.salesCount,
        commissionAmount,
        commissionRate: seller.commissionRate
      });
    }
  }
  
  return commissions;
};

// Método de instancia: registrar venta y actualizar métricas
sellerSchema.methods.recordSale = async function(saleAmount, saleId) {
  this.totalSales += saleAmount;
  this.monthlySales += saleAmount;
  this.salesCount += 1;
  this.lastSaleDate = new Date();
  
  // Calcular comisión para esta venta
  let commissionAmount = 0;
  if (this.commissionType === 'percentage') {
    commissionAmount = saleAmount * this.commissionRate / 100;
  } else {
    commissionAmount = this.fixedCommissionAmount;
  }
  
  this.totalCommission += commissionAmount;
  
  await this.save();
  
  return {
    saleId,
    saleAmount,
    commissionAmount,
    commissionRate: this.commissionRate
  };
};

// Método de instancia: registrar pago de comisión
sellerSchema.methods.recordCommissionPayment = async function(period, amount, paymentReference) {
  const historyEntry = this.commissionHistory.find(h => h.period === period);
  
  if (historyEntry) {
    historyEntry.paid = true;
    historyEntry.paidDate = new Date();
    historyEntry.paymentReference = paymentReference;
  } else {
    this.commissionHistory.push({
      period,
      totalSales: 0,
      commissionAmount: amount,
      commissionRate: this.commissionRate,
      paid: true,
      paidDate: new Date(),
      paymentReference,
      notes: 'Manual commission payment'
    });
  }
  
  await this.save();
  return this;
};

// Método de instancia: obtener comisiones pendientes
sellerSchema.methods.getPendingCommissions = function() {
  return this.commissionHistory.filter(h => !h.paid);
};

// Método de instancia: resetear métricas mensuales
sellerSchema.methods.resetMonthlyMetrics = async function() {
  this.monthlySales = 0;
  await this.save();
};

// Middleware: generar employeeId automáticamente
sellerSchema.pre('save', async function(next) {
  if (!this.employeeId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Seller').countDocuments();
    this.employeeId = `EMP-${year}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Seller', sellerSchema);