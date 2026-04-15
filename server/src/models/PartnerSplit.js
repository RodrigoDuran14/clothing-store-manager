const mongoose = require('mongoose');

// Esquema para división de ingresos entre socios
const partnerSplitSchema = new mongoose.Schema({
  saleId: {  // Venta que generó la división
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true
  },
  saleNumber: {  // Número de venta (para referencia rápida)
    type: String,
    required: true
  },
  date: {  // Fecha de la venta
    type: Date,
    required: true,
    index: true
  },
  totalAmount: {  // Monto total de la venta
    type: Number,
    required: true,
    min: 0
  },
  splits: [{  // Divisiones por socio
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      required: true
    },
    partnerName: {  // Snapshot del nombre del socio
      type: String,
      required: true
    },
    amount: {  // Monto que le corresponde a este socio
      type: Number,
      required: true,
      min: 0
    },
    percentage: {  // Porcentaje de esta venta
      type: Number,
      min: 0,
      max: 100
    },
    items: [{  // Items que pertenecen a este socio
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      productName: String,
      quantity: Number,
      unitPrice: Number,
      subtotal: Number
    }],
    destination: {  // Destino del dinero (caja o banco)
      type: String,
      enum: ['cash_register', 'bank_account'],
      default: 'cash_register'
    },
    destinationId: {  // ID de la caja o cuenta bancaria
      type: mongoose.Schema.Types.ObjectId
    },
    registered: {  // Si ya se registró el movimiento
      type: Boolean,
      default: false
    },
    registeredAt: {  // Fecha de registro
      type: Date
    },
    movementId: {  // ID del movimiento generado
      type: mongoose.Schema.Types.ObjectId
    }
  }],
  paymentMethod: {  // Método de pago principal
    type: String,
    enum: ['cash', 'credit_card', 'debit_card', 'transfer', 'credit_account', 'mixed'],
    required: true
  },
  status: {  // Estado de la división
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  processedBy: {  // Usuario que procesó
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {  // Fecha de procesamiento
    type: Date
  },
  notes: String
}, {
  timestamps: true
});

// Índices
partnerSplitSchema.index({ saleId: 1 });
partnerSplitSchema.index({ partnerId: 1 });
partnerSplitSchema.index({ date: -1 });
partnerSplitSchema.index({ status: 1 });
partnerSplitSchema.index({ 'splits.partnerId': 1 });

// Virtual: total dividido
partnerSplitSchema.virtual('totalSplit').get(function() {
  return this.splits.reduce((sum, split) => sum + split.amount, 0);
});

// Virtual: verificar si está completo
partnerSplitSchema.virtual('isComplete').get(function() {
  return this.splits.every(split => split.registered);
});

// Método: marcar split como registrado
partnerSplitSchema.methods.markSplitRegistered = async function(partnerId, movementId, destinationType, destinationId) {
  const split = this.splits.find(s => s.partnerId.toString() === partnerId.toString());
  
  if (!split) {
    throw new Error(`Split not found for partner ${partnerId}`);
  }
  
  split.registered = true;
  split.registeredAt = new Date();
  split.movementId = movementId;
  split.destination = destinationType;
  split.destinationId = destinationId;
  
  // Si todos los splits están registrados, marcar como completado
  if (this.splits.every(s => s.registered)) {
    this.status = 'completed';
    this.processedAt = new Date();
  }
  
  await this.save();
  return this;
};

// Método estático: obtener splits por socio
partnerSplitSchema.statics.getByPartner = async function(partnerId, startDate, endDate) {
  const filter = {
    'splits.partnerId': partnerId,
    date: {}
  };
  
  if (startDate) filter.date.$gte = startDate;
  if (endDate) filter.date.$lte = endDate;
  
  if (!startDate && !endDate) delete filter.date;
  
  const splits = await this.find(filter)
    .populate('saleId', 'saleNumber clientId')
    .sort({ date: -1 });
  
  // Filtrar solo los splits del socio específico
  return splits.map(split => ({
    ...split.toObject(),
    partnerSplit: split.splits.find(s => s.partnerId.toString() === partnerId.toString())
  }));
};

// Método estático: obtener resumen de splits por período
partnerSplitSchema.statics.getSummaryByPeriod = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    { $unwind: '$splits' },
    {
      $group: {
        _id: '$splits.partnerId',
        totalAmount: { $sum: '$splits.amount' },
        saleCount: { $sum: 1 },
        averageAmount: { $avg: '$splits.amount' }
      }
    },
    {
      $lookup: {
        from: 'partners',
        localField: '_id',
        foreignField: '_id',
        as: 'partner'
      }
    },
    { $unwind: { path: '$partner', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        partnerId: '$_id',
        partnerName: '$partner.name',
        totalAmount: 1,
        saleCount: 1,
        averageAmount: 1
      }
    }
  ]);
};

module.exports = mongoose.model('PartnerSplit', partnerSplitSchema);