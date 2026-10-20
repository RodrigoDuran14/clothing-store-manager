const Client = require('../models/Client');
// const nodemailer = require('nodemailer'); // Descomentar si configuras el envío de emails

// Verificar límite de crédito antes de una venta
const checkCreditBeforeSale = async (clientId, purchaseAmount) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Cliente no encontrado');
  }
  
  // Usamos el método del modelo para verificar
  return client.checkCreditLimit(purchaseAmount);
};

// Alertar por límite de crédito cercano o excedido
const sendCreditAlert = async (clientId, thresholdPercentage = 80) => {
  const client = await Client.findById(clientId);
  
  if (!client) return { alertado: false, reason: 'Cliente no encontrado' };
  
  // Verificar si tiene cuenta corriente habilitada
  if (!client.creditAccount.isEnabled) {
    return { alertado: false, reason: 'Cuenta corriente no habilitada' };
  }
  
  // Acceder al virtual percentage (definido en el modelo como creditUsagePercentage)
  const porcentajeUsado = client.creditUsagePercentage;
  
  if (porcentajeUsado >= thresholdPercentage) {
    const message = `⚠️ ALERTA: Cliente ${client.name} ha usado el ${porcentajeUsado.toFixed(2)}% de su crédito`;
    console.log(message);
    
    // Ejemplo de envío de email (descomentar y configurar)
    // await sendEmail({
    //   to: client.email,
    //   subject: 'Alerta de límite de crédito',
    //   html: `<p>Estimado ${client.name}, has utilizado el ${porcentajeUsado.toFixed(2)}% de tu límite de crédito.</p>`
    // });
    
    return {
      alertado: true,
      cliente: client.name,
      email: client.email,
      porcentaje_usado: porcentajeUsado,
      saldo_actual: client.creditAccount.balance,
      limite: client.creditAccount.creditLimit,
      disponible: client.availableCredit
    };
  }
  
  return { alertado: false };
};

// Verificar automáticamente todos los clientes con crédito cercano al límite
const checkAllCreditLimits = async (thresholdPercentage = 80) => {
  // Usamos el método estático del modelo si existe, o hacemos la búsqueda manual
  // El modelo tiene: Client.getClientsWithCreditRisk(percentage)
  
  const clientsAtRisk = await Client.getClientsWithCreditRisk(thresholdPercentage);
  const alerts = [];
  
  for (const client of clientsAtRisk) {
    // Llamamos a sendCreditAlert para cada uno para generar el reporte completo
    const alert = await sendCreditAlert(client._id, thresholdPercentage);
    if (alert.alertado) {
      alerts.push(alert);
    }
  }
  
  return alerts;
};

// Registrar pago en cuenta corriente
const registerPayment = async (clientId, amount, description, referenceId = null, userId = null) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Cliente no encontrado');
  }
  
  if (!client.creditAccount.isEnabled) {
    throw new Error('El cliente no tiene cuenta corriente habilitada');
  }
  
  if (amount <= 0) {
    throw new Error('El monto del pago debe ser mayor a 0');
  }

  const previousBalance = client.creditAccount.balance;
  
  // Usamos el método del modelo para agregar movimiento
  // type: 'payment' (según enum del modelo)
  const movement = await client.addCreditMovement(
    'payment', 
    amount, 
    description, 
    referenceId, 
    'Payment', 
    userId
  );
  
  return {
    cliente: client.name,
    saldo_anterior: previousBalance,
    saldo_actual: client.creditAccount.balance,
    movimiento: movement,
    disponible_actual: client.availableCredit
  };
};

// Obtener resumen de cuenta corriente
const getCreditSummary = async (clientId) => {
  const client = await Client.findById(clientId)
    .populate('creditAccount.movements.referenceId'); // Selecciona el refPath correcto
  
  if (!client) {
    throw new Error('Cliente no encontrado');
  }
  
  // Obtener últimos movimientos ordenados por fecha (descendente)
  // Los movimientos están en un array, los ordenamos en memoria o en el agregado si fuera necesario
  const movimientosOrdenados = [...client.creditAccount.movements].sort((a, b) => b.date - a.date);
  const ultimosMovimientos = movimientosOrdenados.slice(0, 10);
  
  return {
    cliente: {
      id: client._id,
      nombre: client.name,
      email: client.email,
      telefono: client.phone,
      categoria: client.clientCategory,
      es_vip: client.isVip
    },
    cuenta_corriente: {
      habilitada: client.creditAccount.isEnabled,
      limite: client.creditAccount.creditLimit,
      saldo_actual: client.creditAccount.balance,
      saldo_disponible: client.availableCredit, // Virtual
      porcentaje_usado: client.creditUsagePercentage, // Virtual
      fecha_activacion: client.creditAccount.activationDate,
      ultimo_movimiento: client.creditAccount.lastMovementDate,
      total_movimientos: client.creditAccount.movements.length
    },
    ultimos_movimientos: ultimosMovimientos.map(m => ({
      fecha: m.date,
      tipo: m.type,
      monto: m.amount,
      descripcion: m.description,
      saldo_despues: m.balanceAfter,
      referencia: m.referenceId // Ya populated si existe
    })),
    estadisticas: {
      total_gastado: client.totalSpent,
      ultima_compra: client.lastPurchase,
      historial_compras_count: client.purchaseHistory.length
    }
  };
};

module.exports = {
  checkCreditBeforeSale,
  sendCreditAlert,
  checkAllCreditLimits,
  registerPayment,
  getCreditSummary
};