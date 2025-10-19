const express = require("express");
const router = express.Router();
const {
  postProduct,
  getProductsList,
  updateProduct,
  updateActiveProduct,
  getProductById,
  findProduct,
} = require("../controllers/product.controller");
const { validatePostProduct, validateUpdateProduct } = require("../validators/product.validator");

router.post("/product", validatePostProduct, postProduct);
router.get("/products", getProductsList);
router.get("/product/:id", getProductById);
router.get("/product", findProduct);
router.put("/product/:id", validateUpdateProduct, updateProduct);
router.patch("/productactive/:id", updateActiveProduct);

module.exports = router;