const Partner = require('../models/Partner');
const partnerSplitService = require('../services/partnerSplitService');

// Middleware: verificar que el usuario tenga acceso al socio
const checkPartnerAccess = async (req, res, next) => {
  try {
    const { partnerId } = req.params;
    
    // Si el usuario es admin, tiene acceso a todo
    if (req.user.isAdmin) {
      req.partner = null; // Admin no está limitado a un socio
      return next();
    }
    
    // Buscar socio asociado al usuario
    const partner = await Partner.findOne({ userId: req.user.id });
    
    if (!partner) {
      return res.status(403).json({
        success: false,
        message: 'No partner associated with this user'
      });
    }
    
    // Si se especificó un partnerId, verificar que sea el mismo
    if (partnerId && partner._id.toString() !== partnerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this partner\'s data'
      });
    }
    
    req.partner = partner;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware: verificar que el producto pertenezca al socio
const checkProductBelongsToPartner = async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    // Admin puede ver todo
    if (req.user.isAdmin) {
      return next();
    }
    
    const partner = await Partner.findOne({ userId: req.user.id });
    
    if (!partner) {
      return res.status(403).json({
        success: false,
        message: 'No partner associated with this user'
      });
    }
    
    const ownership = await partnerSplitService.checkProductOwnership(productId, partner._id);
    
    if (!ownership.authorized) {
      return res.status(403).json({
        success: false,
        message: ownership.message
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware: filtrar productos por socio automáticamente
const filterProductsByPartner = async (req, res, next) => {
  try {
    // Admin ve todos los productos
    if (req.user.isAdmin) {
      return next();
    }
    
    const partner = await Partner.findOne({ userId: req.user.id });
    
    if (!partner) {
      return res.status(403).json({
        success: false,
        message: 'No partner associated with this user'
      });
    }
    
    const ownedProducts = await partner.getOwnedProducts();
    const productIds = ownedProducts.map(p => p._id);
    
    // Inyectar filtro en la query
    req.productFilter = { _id: { $in: productIds } };
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkPartnerAccess,
  checkProductBelongsToPartner,
  filterProductsByPartner
};