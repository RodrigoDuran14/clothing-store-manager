const ProductModel = require("../models/Product.model");
const CategoryModel = require("../models/Category.model");
const SupplierModel = require("../models/Supplier.model");
const generateProductQR = require("../utils/generateQRProduct");

//crear producto
const postProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      categoryId,
      supplierId,
      variants,
      percent,
      cost,
    } = req.body;

    const category = await CategoryModel.findById(categoryId);
    if (!category) {
      return re.status(400).json({ message: "Categoría no encontrada" });
    }

    if (supplierId) {
      const supplier = await SupplierModel.findById(supplierId);
      if (!supplier) {
        return res.status(400).json({ message: "Proveedor no encontrado" });
      }
    }

    const newProduct = new ProductModel({
      name,
      description,
      categoryId,
      supplierId,
      variants,
      price: cost * (percent / 100) + cost,
      cost,
      priceHistory: [{ price, date: new Date() }],
    });

    const savedProduct = await newProduct.save();

    const size = variants[0]?.size;

    const qrCode = await generateProductQR({
      id: savedProduct._id,
      name: savedProduct.name,
      category: category.name,
      size,
      price: savedProduct.price,
    });

    savedProduct.qrCode = qrCode;

    await savedProduct.save();

    res.status(201).send(savedProduct);
  } catch (error) {
    next(error);
  }
};

//listar TODOS los productos
const getProductsList = async (req, res, next) => {
  try {
    const allProduct = await ProductModel.find();

    res.status(200).send(allProduct);
  } catch (error) {
    next(error);
  }
};

//listar productos activos/inactivos
const getActiveProducts = async (req, res, next) => {
  try {
    const { active } = req.query;
    const filter = {};

    if (active === "true") filter.active = true;
    else if (active === "false") filter.active = false;

    const products = await ProductModel.find(filter)
      .populate("categoryId", "name")
      .populate("supplierId", "name");

    res.status(200).send(products);
  } catch (error) {
    next(error);
  }
};

//traer producto por id
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await ProductModel.findById({ _id: id }).populate(
      "categoryId",
      "name"
    );

    if (!product)
      return res.status(404).send({ error: "Producto no encontrado" });

    res.status(200).send(product);
  } catch (error) {
    next(error);
  }
};

//traer productos con bajo stock
const getLowStockProducts = async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5;
    const products = await ProductModel.find({
      variants: { $elemMatch: { stock: { $lt: threshold } } },
    }).populate("categoryId", "name");

    res.status(200).send(products);
  } catch (error) {
    next(error);
  }
};

//traer historial de precio
const getPriceHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await ProductModel.findById(id, "name priceHistory");

    if (!product)
      return res.status(404).send({ error: "Producto no encontrado" });

    res
      .status(200)
      .send({ name: product.name, priceHistory: product.priceHistory });
  } catch (error) {
    next(error);
  }
};

//actualizar producto
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const product = await ProductModel.findById(id).populate(
      "categoryId",
      "name"
    );
    if (!product) {
      return res.status(404).send({ error: "Producto no encontrado" });
    }

    let qrNeedsUpdate = false;
    let priceChanged = false;

    const cost = update.cost != null ? update.cost : product.cost;
    const percent = update.percent != null ? update.percent : product.percent;
    const categoryId = update.categoryId || product.categoryId?._id;
    const name = update.name || product.name;
    const variants = update.variants || product.variants;

    //si cambia cost o percent, actualizar
    if (update.cost != null || update.percent != null) {
      const newPrice = cost * (percent / 100) + cost;
      update.price = newPrice;

      if (newPrice !== product.price) {
        priceChanged = true;
      }
    }

    //si cambia name, category o size, regenerar qr
    if (
      update.name ||
      update.categoryId ||
      (Array.isArray(update.variants) && update.variants[0]?.size)
    ) {
      qrNeedsUpdate = true;
    }

    const updatedProduct = await ProductModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).populate("categoryId");

    if (priceChanged) {
      updatedProduct.priceHistory.push({
        price: newPrice,
        date: new Date(),
      });
    }

    if (qrNeedsUpdate) {
      const size = updatedProduct.variants[0]?.size || "N/A";
      const category = updatedProduct.categoryId?.name || "Sin categoría";

      const qrCode = await generateProductQR({
        id: updatedProduct._id,
        name: updatedProduct.name,
        category,
        size,
        price: updatedProduct.price,
      });

      updatedProduct.qrCode = qrCode;
    }
    await updatedProduct.save();

    res.status(200).send(updatedProduct);
  } catch (error) {
    next(error);
  }
};

//actualizar stock solamente
const updateStock = async (req, res, next) => {
  try {
    const { id, size, color, stock } = req.body;

    if (!id || !size || !color || stock == null) {
      return res
        .status(400)
        .send({ error: "Datos incompletos para actualizar stock" });
    }
    const product = await ProductModel.findById(id);
    if (!product)
      return res.status(404).send({ error: "Producto no encontrado" });

    const variant = product.variants.find(
      (v) =>
        v.size.toLowerCase() === size.toLowerCase() &&
        v.color.toLowerCase() === color.toLowerCase()
    );

    if (!variant)
      return res.status(404).send({ error: "Variante no encontrada" });

    variant.stock = stock;

    await product.save();
    res.status(200).send(product);
  } catch (error) {
    next(error);
  }
};

//borrado logico
const updateActiveProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await ProductModel.findById(id);

    if (!product)
      return res.status(404).send({ error: "Producto no encontrado" });

    product.active = !product.active;

    await product.save();

    res.status(200).send(product);
  } catch (error) {
    next(error);
  }
};

//borrado fisico(para admin)
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await ProductModel.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).send({ error: "Producto no encontrado" });
    }

    res.status(200).send({ message: "Producto eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

//buscar productos
const findProduct = async (req, res, next) => {
  try {
    const { name, size, color, category, supplier } = req.query;

    const filter = {};

    if (name) filter.name = { $regex: name, $options: "i" };

    if (category) {
      const categoryDoc = await CategoryModel.findOne({
        name: { $regex: category, $options: "i" },
      });

      if (!categoryDoc) {
        return res
          .status(404)
          .send({ error: `No se encontró la categoría: ${category}` });
      }
      filter.categoryId = categoryDoc._id;
    }

    if (supplier) {
      const supplierDoc = await SupplierModel.findOne({
        name: { $regex: supplier, $options: "i" },
      });

      if (!supplierDoc) {
        return res
          .status(404)
          .send({ error: `No se encontró el proveedor: ${supplier}` });
      }
      filter.supplierId = supplierDoc._id;
    }

    if (size || color) {
      filter.variants = { $elemMatch: {} };

      if (size) {
        filter.variants.$elemMatch.size = { $regex: size, $options: "i" };
      }
      if (color) {
        filter.variants.$elemMatch.color = { $regex: color, $options: "i" };
      }
    }

    const products = await ProductModel.find(filter)
      .populate("categoryId", "name")
      .populate("supplierId", "name");

    if (!products.length) {
      return res.status(404).json({ error: "No se encontraron productos" });
    }

    res.status(200).send(products);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
