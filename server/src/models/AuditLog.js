// models/AuditLog.js
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  userEmail: String,
  userRole: String, // 'admin', 'partner', 'seller', 'client'
  action: { type: String, required: true, index: true }, // 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT'
  entity: { type: String, required: true, index: true }, // 'Product', 'Sale', 'Client', 'User', etc.
  entityId: { type: mongoose.Schema.Types.ObjectId, index: true },
  oldData: mongoose.Schema.Types.Mixed, // snapshot antes del cambio (opcional)
  newData: mongoose.Schema.Types.Mixed, // snapshot después del cambio
  changes: [
    {
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
    },
  ],
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now, index: true },
});

// Índice compuesto para búsquedas frecuentes
auditLogSchema.index({ entity: 1, entityId: 1, timestamp: -1 });

// Índice TTL: 6 meses = 180 días = 15552000 segundos
// Opción 1: usando expireAfterSeconds en la definición del índice
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 15552000 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
