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

    const updatedProduct = await ProductModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).send({ error: "Producto no encontrado" });
    }

    res.status(200).send(updatedProduct);
  } catch (error) {
    next(error);
  }
};

const updateActiveProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await ProductModel.findById(id);

    if (!product) return res.status(404).send({ error: "Producto no encontrado" });

    product.active = !product.active

    await product.save();

    res.status(200).send(product);
  } catch (error) {
    next(error)
  }
};

const getProductById = async (req,res,next) =>{
  try {
    const {id} = req.params
    const product = await ProductModel.findById({_id:id})

    if(!product) return res.status(404).send({error: "Producto no encontrado"})

    res.status(200).send(product)
  } catch (error) {
    next(error)
  }
}

const findProduct = (req,res,next) =>{
  try {
    
  } catch (error) {
    next(error)
  }
}

module.exports = {
  postProduct,
  getProductsList,
  updateProduct,
  updateActiveProduct,
  getProductById
};
