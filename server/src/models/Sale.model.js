const mongoose = require("mongoose");

//venta productos
const saleProductSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productName: String,
    quantity: Number,
    unitPrice: Number,
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

//pago
const paymentSchema = new mongoose.Schema(
  {
    method: String,
    amount: Number,
    date: Date,
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "BankAccount" },
    partnerCashboxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerCashbox",
    },
  },
  { _id: false }
);

//ventas
const saleSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller" },
    products: [saleProductSchema],
    subtotal: Number,
    discount: Number,
    total: Number,
    payments: [paymentSchema],
    date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "paid", "canceled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

saleSchema.index({ date: -1 });

module.exports = mongoose.model("Sale", saleSchema);
