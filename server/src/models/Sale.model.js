const mongoose = require("mongoose");

//venta productos
const saleProductSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "El producto es obligatorio"],
    },
    productName: {
      type: String,
      required: [true, "El nombre del producto es obligatorio"],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "La cantidad es obligatoria"],
      min: [1, "La cantidad mínima es 1"],
    },
    unitPrice: {
      type: Number,
      required: [true, "El precio unitario es obligatorio"],
      min: [0, "El precio unitario no puede ser negativo"],
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false }
);

//pago
const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      required: [true, "El método de pago es obligatorio"],
      enum: ["cash", "card", "transfer", "other"],
    },
    amount: {
      type: Number,
      required: [true, "El monto del pago es obligatorio"],
      min: [0, "El monto no puede ser negativo"],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
    },
    partnerCashboxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerCashBox",
    },
  },
  { _id: false }
);

//ventas
const saleSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "El cliente es obligatorio"],
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El vendedor es obligatorio"],
    },
    products: {
      type: [saleProductSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "Debe haber al menos un producto en la venta",
      },
    },
    subtotal: {
      type: Number,
      required: [true, "El subtotal es obligatorio"],
      min: [0, "El subtotal no puede ser negativo"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "El descuento no puede ser negativo"],
    },
    total: {
      type: Number,
      required: [true, "El total es obligatorio"],
      min: [0, "El total no puede ser negativo"],
    },
    payments: {
      type: [paymentSchema],
      default: [],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "canceled"],
      default: "pending",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

saleSchema.index({ date: -1 });

const SaleModel = mongoose.model("Sale", saleSchema);

module.exports = SaleModel;
