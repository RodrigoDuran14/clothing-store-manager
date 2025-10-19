const ProductModel = require("../models/Product.model");
const CategoryModel = require("../models/Category.model");
const SupplierModel = require("../models/Supplier.model");
const generateProductQR = require("../utils/generateQRProduct");

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

const getProductsList = async (req, res, next) => {
  try {
    const allProduct = await ProductModel.find();

    res.status(200).send(allProduct);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const product = await ProductModel.findById(id).populate("categoryId")
    if(!product){
      return res.status(404).send({error: "Producto no encontrado"})
    }

    let qrNeedsUpdate = false
    let priceChanged = false

    const cost = update.cost != null ? update.cost : product.cost
    const percent = update.percent != null ? update.percent : product.percent
    const categoryId = update.categoryId || product.categoryId?._id
    const name = update.name || product.name
    const variants = update.variants || product.variants

    //si cambia cost o percent, actualizar
    if(update.cost != null || update.percent != null){
      const newPrice = cost * (percent / 100) + cost
      update.price = newPrice

      if(newPrice !== product.price){
        priceChanged = true
      }
    }

    //si cambia name, category o size, regenerar qr
    if(update.name || update.categoryId || (Array.isArray(update.variants) && update.variants[0]?.size)){
      qrNeedsUpdate = true
    }

    const updatedProduct = await ProductModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).populate("categoryId");

    if (priceChanged) {
      updatedProduct.priceHistory.push({
        price: newPrice,
        date: new Date()
      })
    }

    if(qrNeedsUpdate){
      const size = updatedProduct.variants[0]?.size || "N/A"
      const category = updatedProduct.categoryId?.name || "Sin categoría"

      const qrCode = await generateProductQR({
        id: updatedProduct._id,
        name: updatedProduct.name,
        category,
        size,
        price: updatedProduct.price
      })

      updatedProduct.qrCode = qrCode
    }
    await updatedProduct.save()

    res.status(200).send(updatedProduct);
  } catch (error) {
    next(error);
  }
};

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

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await ProductModel.findById({ _id: id });

    if (!product)
      return res.status(404).send({ error: "Producto no encontrado" });

    res.status(200).send(product);
  } catch (error) {
    next(error);
  }
};

const findProduct = async (req, res, next) => {
  try {
    const { name, size, color, category } = req.query;

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
  findProduct
};
