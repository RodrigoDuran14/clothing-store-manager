// routes/auditRoutes.js
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');

router.get('/', protect, isAdmin, async (req, res, next) => {
  try {
    const { entity, userId, action, startDate, endDate, limit = 100, page = 1 } = req.query;
    const filter = {};
    if (entity) filter.entity = entity;
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email');
    
    const total = await AuditLog.countDocuments(filter);
    res.json({
      success: true,
      data: logs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;