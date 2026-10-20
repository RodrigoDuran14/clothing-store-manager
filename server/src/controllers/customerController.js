// controllers/customerController.js
const customerAuthService = require('../services/customerAuthService');
const auditService = require('../services/auditService');

exports.register = async (req, res, next) => {
  try {
    const { customer, token } = await customerAuthService.register(req.body);
    // Auditoría (sin req.user porque aún no está logueado)
    await auditService.logAction({
      userId: customer._id,
      userEmail: customer.email,
      userRole: 'customer',
      action: 'REGISTER',
      entity: 'Customer',
      entityId: customer._id,
      newData: { firstName: customer.firstName, lastName: customer.lastName, email: customer.email },
      req
    });
    res.status(201).json({ success: true, token, customer: { id: customer._id, name: `${customer.firstName} ${customer.lastName}`, email: customer.email } });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { customer, token } = await customerAuthService.login(email, password);
    await auditService.logAction({
      userId: customer._id,
      userEmail: customer.email,
      userRole: 'customer',
      action: 'LOGIN',
      entity: 'Customer',
      entityId: customer._id,
      req
    });
    res.json({ success: true, token, customer: { id: customer._id, name: `${customer.firstName} ${customer.lastName}`, email: customer.email } });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const customer = await customerAuthService.getCustomerById(req.customer._id);
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const updated = await customerAuthService.updateProfile(req.customer._id, req.body);
    await auditService.logAction({
      userId: req.customer._id,
      userEmail: req.customer.email,
      userRole: 'customer',
      action: 'UPDATE',
      entity: 'Customer',
      entityId: req.customer._id,
      newData: updated.toObject(),
      req
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.addAddress = async (req, res, next) => {
  try {
    const addresses = await customerAuthService.addAddress(req.customer._id, req.body);
    res.json({ success: true, data: addresses });
  } catch (error) {
    next(error);
  }
};

exports.updateAddress = async (req, res, next) => {
  try {
    const addresses = await customerAuthService.updateAddress(req.customer._id, req.params.addressId, req.body);
    res.json({ success: true, data: addresses });
  } catch (error) {
    next(error);
  }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    const addresses = await customerAuthService.deleteAddress(req.customer._id, req.params.addressId);
    res.json({ success: true, data: addresses });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await customerAuthService.changePassword(req.customer._id, currentPassword, newPassword);
    await auditService.logAction({
      userId: req.customer._id,
      userEmail: req.customer.email,
      userRole: 'customer',
      action: 'CHANGE_PASSWORD',
      entity: 'Customer',
      entityId: req.customer._id,
      req
    });
    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (error) {
    next(error);
  }
};

exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    const resetToken = await customerAuthService.requestPasswordReset(email);
    // Aquí enviar email con el enlace: `${FRONTEND_URL}/reset-password?token=${resetToken}`
    // Simulamos respuesta
    res.json({ success: true, message: 'Si el email existe, recibirás instrucciones' });
  } catch (error) {
    // No revelar si el email existe por seguridad
    res.json({ success: true, message: 'Si el email existe, recibirás instrucciones' });
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    await customerAuthService.resetPassword(token, newPassword);
    res.json({ success: true, message: 'Contraseña restablecida correctamente' });
  } catch (error) {
    next(error);
  }
};

// Obtener pedidos del cliente (ventas donde clientId corresponde a su customerId? 
// Necesitamos vincular Customer con Sale. Podemos agregar un campo customerId en Sale que referencie a Customer.
// Por ahora asumimos que existe relación.
exports.getOrders = async (req, res, next) => {
  try {
    const Sale = require('../models/Sale');
    const orders = await Sale.find({ customerId: req.customer._id, origin: 'ecommerce' }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};