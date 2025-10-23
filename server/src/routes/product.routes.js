const express = require("express");
const router = express.Router();
const {
  postProduct,
  getProductsList,
  updateProduct,
  updateActiveProduct,
  getProductById,
  findProduct,
  deleteProduct,
  updateStock,
  getLowStockProducts,
  getPriceHistory,
  getActiveProducts,
} = require("../controllers/product.controller");
const {
  validatePostProduct,
  validateUpdateProduct,
} = require("../validators/product.validator");

router.post("/product", validatePostProduct, postProduct);
router.get("/products", getProductsList);
router.get("/product/:id", getProductById);
router.get("/product/:id/history", getPriceHistory);
router.get("/product", getActiveProducts);
router.get("/product/find", findProduct);
router.get("/product/low-stock", getLowStockProducts);
router.put("/product/:id", validateUpdateProduct, updateProduct);
router.patch("/product/stock", updateStock);
router.patch("/product/active/:id", updateActiveProduct);
router.delete("/product/:id", deleteProduct);

module.exports = router;
