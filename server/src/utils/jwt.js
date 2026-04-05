const jwt = require('jsonwebtoken');

const signToken = (id) => {
  return jwt.sign(
    { id }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  
  // Remover password de la respuesta
  user.password = undefined;
  
  res.status(statusCode).json({
    success: true,
    token,
    user
  });
};

module.exports = {
  signToken,
  verifyToken,
  createSendToken
};