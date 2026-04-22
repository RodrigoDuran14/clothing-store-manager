const cron = require('node-cron');
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');

// Procesar notificaciones programadas cada minuto
cron.schedule('* * * * *', async () => {
  const now = new Date();
  
  const pendingNotifications = await Notification.find({
    status: 'pending',
    scheduledFor: { $lte: now }
  });
  
  for (const notification of pendingNotifications) {
    await notificationService.processNotification(notification);
  }
});

// Limpiar notificaciones antiguas (más de 30 días) cada día a las 3 AM
cron.schedule('0 3 * * *', async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const result = await Notification.deleteMany({
    status: 'read',
    readAt: { $lte: thirtyDaysAgo }
  });
  
  console.log(`Cleaned up ${result.deletedCount} old notifications`);
});

module.exports = {
  startNotificationJobs: () => {
    console.log('Notification jobs scheduled');
  }
};