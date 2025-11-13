const express = require("express");
const router = express.Router();
const {
  postCustomer,
  getCustomersList,
  findCustomer,
  getCustomerById,
  updateCustomer,
  updateActiveCustomer,
  addTransaction,
  updateCreditLimit,
  addPurchase,
  getPurchaseHistory,
  getBalance,
  getTopCustomers,
  getDebtors,
  getMonthlySummary,
} = require("../controllers/customer.controller");

router.post("/customer", postCustomer);
router.get("/customers", getCustomersList);
router.get("/customer/:id", getCustomerById);
router.get("/customer", findCustomer);
router.put("/customer/:id", updateCustomer);
router.patch("/customer/active/:id", updateActiveCustomer);

router.get("/customer/:id/balance", getBalance);
router.patch("/customer/:id/credit-limit", updateCreditLimit);
router.post("/customer/:id/transaction", addTransaction);

router.post("/customer/:id/purchase", addPurchase);
router.get("/customer/:id/purchases", getPurchaseHistory);

router.get("/customerreport/top", getTopCustomers);
router.get("/customer/report/debtors", getDebtors);
router.get("/customer/report/monthly", getMonthlySummary);

module.exports = router;
