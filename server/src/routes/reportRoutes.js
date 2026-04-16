const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/Auth');
const { isAdmin } = require('../middleware/role');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(protect);

// ============================================
// DASHBOARD Y KPIs
// ============================================
router.get('/dashboard', reportController.getDashboard);

// ============================================
// REPORTES DE VENTAS
// ============================================
router.get('/sales', reportController.getSalesReport);

// ============================================
// REPORTES DE PRODUCTOS
// ============================================
router.get('/products', reportController.getProductsReport);
router.get('/stock', reportController.getStockReport);

// ============================================
// REPORTES DE CLIENTES
// ============================================
router.get('/clients', reportController.getClientsReport);

// ============================================
// REPORTES DE COMISIONES (solo admin)
// ============================================
router.get('/commissions', isAdmin, reportController.getCommissionsReport);


// ============================================
// REPORTES FINANCIEROS
// ============================================
router.get('/income-statement', reportController.getIncomeStatement);
router.get('/cash-flow', reportController.getCashFlow);
router.get('/aged-receivables', reportController.getAgedAccountsReceivable);
router.get('/credit-alerts', reportController.getCreditAlerts);

// ============================================
// REPORTES DE INVENTARIO
// ============================================
router.get('/stock-turnover', reportController.getStockTurnover);
router.get('/replenishment-projection', reportController.getReplenishmentProjection);

// ============================================
// REPORTES DE VENTAS
// ============================================
router.get('/monthly-comparison', reportController.getMonthlyComparison);
router.get('/sales-by-time', reportController.getSalesByTimeSlot);
router.get('/shift-effectiveness', reportController.getShiftEffectiveness);
router.get('/seller-productivity', reportController.getSellerProductivity);

// ============================================
// REPORTES DE DEVOLUCIONES
// ============================================
router.get('/most-returned-products', reportController.getMostReturnedProducts);


// ============================================
// REPORTES POR SOCIO
// ============================================
router.get('/partner-sales-profits', reportController.getPartnerSalesAndProfits);
router.get('/partner-comparison', reportController.getPartnerComparison);


module.exports = router; 