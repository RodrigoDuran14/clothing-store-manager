// middleware/customerAuth.js
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

const protectCustomer = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'No autorizado, inicia sesión' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Acceso solo para clientes' });
    }
    const customer = await Customer.findById(decoded.id);
    if (!customer || !customer.isActive) {
      return res.status(401).json({ success: false, message: 'Usuario no válido' });
    }
    req.customer = customer;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
};

module.exports = { protectCustomer };