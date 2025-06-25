const mongoose = require("mongoose");

//detalle factura
const invoiceDetailSchema = new mongoose.Schema(
  {
    product: String,
    quantity: Number,
    unitPrice: Number,
    subtotal: Number,
  },
  { _id: false }
);

//factura
const invoiceSchema = new mongoose.Schema(
  {
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
    invoiceNumber: String,
    issueDate: Date,
    issuer: { name: String, taxId: String, address: String, taxStatus: String },
    receiver: {
      name: String,
      document: String,
      address: String,
      taxStatus: String,
    },
    details: [invoiceDetailSchema],
    subtotal: Number,
    total: Number,
    paymentMethod: String,
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "BankAccount" },
    qrCode: String,
    status: { type: String, enum: ["issued", "canceled"], default: "issued" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
