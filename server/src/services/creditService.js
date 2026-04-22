const Client = require('../models/Client');
const nodemailer = require('nodemailer'); // Para alertas por email

// Verificar límite de crédito antes de una venta
const checkCreditBeforeSale = async (clientId, montoCompra) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Cliente no encontrado');
  }
  
  return client.checkCreditLimit(montoCompra);
};

// Alertar por límite de crédito cercano o excedido
const sendCreditAlert = async (clientId, porcentajeUmbral = 80) => {
  const client = await Client.findById(clientId);
  if (!client || !client.cuenta_corriente.habilitada) return;
  
  const porcentajeUsado = client.porcentaje_credito_usado;
  
  if (porcentajeUsado >= porcentajeUmbral) {
    // Aquí se puede enviar email, notificación push, etc.
    console.log(`⚠️ ALERTA: Cliente ${client.nombre} ha usado el ${porcentajeUsado}% de su crédito`);
    
    // Ejemplo de envío de email (requiere configuración SMTP)
    // await sendEmail({
    //   to: client.email,
    //   subject: 'Alerta de límite de crédito',
    //   html: `<p>Estimado ${client.nombre}, has utilizado el ${porcentajeUsado}% de tu límite de crédito.</p>`
    // });
    
    return {
      alertado: true,
      cliente: client.nombre,
      porcentaje_usado: porcentajeUsado,
      saldo_actual: client.cuenta_corriente.saldo,
      limite: client.cuenta_corriente.limite_credito
    };
  }
  
  return { alertado: false };
};

// Verificar automáticamente todos los clientes con crédito cercano al límite
const checkAllCreditLimits = async (porcentajeUmbral = 80) => {
  const clients = await Client.find({ 'cuenta_corriente.habilitada': true });
  const alerts = [];
  
  for (const client of clients) {
    const alert = await sendCreditAlert(client._id, porcentajeUmbral);
    if (alert.alertado) {
      alerts.push(alert);
    }
  }
  
  return alerts;
};

// Registrar pago en cuenta corriente
const registerPayment = async (clientId, monto, descripcion, referencia_id = null, usuario_id = null) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Cliente no encontrado');
  }
  
  if (!client.cuenta_corriente.habilitada) {
    throw new Error('El cliente no tiene cuenta corriente habilitada');
  }
  
  const movimiento = await client.addCreditMovement(
    'pago',
    monto,
    descripcion,
    referencia_id,
    'Payment',
    usuario_id
  );
  
  return {
    cliente: client.nombre,
    saldo_anterior: client.cuenta_corriente.saldo + monto,
    saldo_actual: client.cuenta_corriente.saldo,
    movimiento
  };
};

// Obtener resumen de cuenta corriente
const getCreditSummary = async (clientId) => {
  const client = await Client.findById(clientId)
    .populate('cuenta_corriente.movimientos.referencia_id');
  
  if (!client) {
    throw new Error('Cliente no encontrado');
  }
  
  // Obtener últimos 10 movimientos
  const ultimosMovimientos = client.cuenta_corriente.movimientos
    .sort((a, b) => b.fecha - a.fecha)
    .slice(0, 10);
  
  return {
    cliente: {
      id: client._id,
      nombre: client.nombre,
      email: client.email,
      telefono: client.telefono
    },
    cuenta_corriente: {
      habilitada: client.cuenta_corriente.habilitada,
      limite: client.cuenta_corriente.limite_credito,
      saldo_actual: client.cuenta_corriente.saldo,
      saldo_disponible: client.saldo_disponible,
      porcentaje_usado: client.porcentaje_credito_usado,
      fecha_activacion: client.cuenta_corriente.fecha_activacion,
      ultimo_movimiento: client.cuenta_corriente.fecha_ultimo_movimiento
    },
    ultimos_movimientos: ultimosMovimientos,
    estadisticas: {
      total_compras: client.total_gastado,
      categoria: client.categoria_cliente,
      es_vip: client.vip
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