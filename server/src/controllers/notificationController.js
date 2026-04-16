const Notification = require('../models/Notification');
const NotificationTemplate = require('../models/NotificationTemplate');
const notificationService = require('../services/notificationService');
const { paginate, formatPagination } = require('../utils/helpers');

// @desc    Obtener mis notificaciones
// @route   GET /api/notifications
// @access  Private
exports.getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const filter = { userId: req.user.id };
    if (unreadOnly === 'true') {
      filter.status = { $in: ['pending', 'sent'] };
    }
    
    const { skip, limit: limitValue, page: currentPage } = paginate(page, limit);
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitValue);
    
    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      status: { $in: ['pending', 'sent'] }
    });
    const pagination = formatPagination(total, currentPage, limitValue);
    
    res.status(200).json({
      success: true,
      data: {
        unreadCount,
        notifications,
        pagination
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Marcar notificación como leída
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    await notification.markAsRead();
    
    res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Marcar todas como leídas
// @route   PUT /api/notifications/mark-all-read
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.markAllAsRead(req.user.id);
    
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener plantillas (admin)
// @route   GET /api/notifications/templates
// @access  Private/Admin
exports.getTemplates = async (req, res, next) => {
  try {
    const templates = await NotificationTemplate.find()
      .sort({ type: 1 });
    
    res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear/Actualizar plantilla (admin)
// @route   POST /api/notifications/templates
// @access  Private/Admin
exports.saveTemplate = async (req, res, next) => {
  try {
    const { name, type, subject, title, body, htmlBody, variables, channels, isActive } = req.body;
    
    let template = await NotificationTemplate.findOne({ type });
    
    if (template) {
      // Actualizar
      template.name = name;
      template.subject = subject;
      template.title = title;
      template.body = body;
      template.htmlBody = htmlBody;
      template.variables = variables;
      template.channels = channels;
      template.isActive = isActive;
      template.updatedBy = req.user.id;
    } else {
      // Crear
      template = new NotificationTemplate({
        name,
        type,
        subject,
        title,
        body,
        htmlBody,
        variables,
        channels,
        isActive,
        createdBy: req.user.id
      });
    }
    
    await template.save();
    
    res.status(200).json({
      success: true,
      data: template,
      message: 'Template saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Enviar notificación manual (admin)
// @route   POST /api/notifications/send
// @access  Private/Admin
exports.sendManualNotification = async (req, res, next) => {
  try {
    const { recipient, type, variables, channels, priority, scheduledFor } = req.body;
    
    const notification = await notificationService.sendNotification({
      recipient,
      type,
      variables,
      channels,
      priority,
      scheduledFor,
      createdBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar notificación
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};