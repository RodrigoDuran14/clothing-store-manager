// services/auditService.js
const AuditLog = require('../models/AuditLog');

const logAction = async ({
  userId, userEmail, userRole,
  action, entity, entityId,
  oldData, newData, changes,
  req // para obtener ip y userAgent
}) => {
  try {
    const logEntry = new AuditLog({
      userId,
      userEmail,
      userRole,
      action,
      entity,
      entityId,
      oldData,
      newData,
      changes,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers['user-agent']
    });
    await logEntry.save();
    return logEntry;
  } catch (error) {
    console.error('Error saving audit log:', error);
    // No interrumpir la operación principal
  }
};

// Función para registrar cambios entre dos objetos (diferencia)
const computeChanges = (oldObj, newObj, ignoredFields = ['updatedAt', 'createdAt', '__v']) => {
  const changes = [];
  for (const key of Object.keys(newObj)) {
    if (ignoredFields.includes(key)) continue;
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      changes.push({
        field: key,
        oldValue: oldObj[key],
        newValue: newObj[key]
      });
    }
  }
  return changes;
};

module.exports = { logAction, computeChanges };