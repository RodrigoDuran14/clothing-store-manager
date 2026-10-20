// services/customerAuthService.js
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");
const crypto = require("crypto");

const signToken = (id) => {
  return jwt.sign({ id, role: "customer" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

const register = async (customerData) => {
  const { firstName, lastName, email, password, phone } = customerData;
  const existing = await Customer.findOne({ email });
  if (existing) throw new Error("El email ya está registrado");

  const customer = await Customer.create({
    firstName,
    lastName,
    email,
    password,
    phone,
  });
  const token = signToken(customer._id);
  return { customer, token };
};

const login = async (email, password) => {
  const customer = await Customer.findOne({ email }).select("+password");
  if (!customer) throw new Error("Email o contraseña incorrectos");
  const isMatch = await customer.comparePassword(password);
  if (!isMatch) throw new Error("Email o contraseña incorrectos");
  if (!customer.isActive) throw new Error("Cuenta desactivada");

  customer.lastLogin = new Date();
  await customer.save({ validateBeforeSave: false });

  const Cart = require("../models/Cart");
  const sessionId = req.headers["x-session-id"];
  if (sessionId) {
    await Cart.updateOne(
      { sessionId },
      { $set: { clientId: customer._id, sessionId: null } },
    );
  }

  const token = signToken(customer._id);
  return { customer, token };
};

const getCustomerById = async (id) => {
  return await Customer.findById(id);
};

const updateProfile = async (id, updateData) => {
  const allowed = ["firstName", "lastName", "phone"];
  const filtered = {};
  for (const key of allowed) {
    if (updateData[key] !== undefined) filtered[key] = updateData[key];
  }
  const customer = await Customer.findByIdAndUpdate(id, filtered, {
    new: true,
    runValidators: true,
  });
  return customer;
};

const addAddress = async (customerId, addressData) => {
  const customer = await Customer.findById(customerId);
  if (!customer) throw new Error("Cliente no encontrado");

  // Si es la primera dirección o se marca como default, quitar default de otras
  if (addressData.isDefault || customer.addresses.length === 0) {
    customer.addresses.forEach((addr) => (addr.isDefault = false));
    addressData.isDefault = true;
  }
  customer.addresses.push(addressData);
  await customer.save();
  return customer.addresses;
};

const updateAddress = async (customerId, addressId, updateData) => {
  const customer = await Customer.findById(customerId);
  const address = customer.addresses.id(addressId);
  if (!address) throw new Error("Dirección no encontrada");

  if (updateData.isDefault) {
    customer.addresses.forEach((addr) => (addr.isDefault = false));
  }
  Object.assign(address, updateData);
  await customer.save();
  return customer.addresses;
};

const deleteAddress = async (customerId, addressId) => {
  const customer = await Customer.findById(customerId);
  customer.addresses.id(addressId).remove();
  await customer.save();
  return customer.addresses;
};

const changePassword = async (customerId, oldPassword, newPassword) => {
  const customer = await Customer.findById(customerId).select("+password");
  if (!(await customer.comparePassword(oldPassword)))
    throw new Error("Contraseña actual incorrecta");
  customer.password = newPassword;
  await customer.save();
  return true;
};

const requestPasswordReset = async (email) => {
  const customer = await Customer.findOne({ email });
  if (!customer) throw new Error("No existe cuenta con ese email");
  const resetToken = crypto.randomBytes(32).toString("hex");
  customer.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  customer.passwordResetExpires = Date.now() + 3600000; // 1 hora
  await customer.save();
  return resetToken; // enviar este token por email
};

const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const customer = await Customer.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!customer) throw new Error("Token inválido o expirado");
  customer.password = newPassword;
  customer.passwordResetToken = undefined;
  customer.passwordResetExpires = undefined;
  await customer.save();
  return customer;
};

module.exports = {
  register,
  login,
  getCustomerById,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  changePassword,
  requestPasswordReset,
  resetPassword,
};
