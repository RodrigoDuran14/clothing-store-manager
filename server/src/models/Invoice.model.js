const mongoose = require("mongoose");

//detalle factura
const invoiceDetailSchema = new mongoose.Schema(
  {
    product: {
      type: String,
      required: [true, "El producto es obligatorio"],
      trim: true,
      minlength: [3, "El nombre del producto debe tener al menos 3 caracteres"],
    },
    quantity: {
      type: Number,
      required: [true, "La cantidad es obligatoria"],
      min: [1, "La cantidad debe ser al menos 1"],
    },
    unitPrice: {
      type: Number,
      required: [true, "El precio unitario es obligatorio"],
      min: [0, "El precio unitario no puede ser negativo"],
    },
    subtotal: {
      type: Number,
      required: [true, "El subtotal es obligatorio"],
      min: [0, "El subtotal no puede ser negativo"],
    },
  },
  { _id: false }
);

//factura
const invoiceSchema = new mongoose.Schema(
  {
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: [true, "La venta asociada es obligatoria"],
    },
    invoiceNumber: {
      type: String,
      required: [true, "El número de factura es obligatorio"],
      unique: true,
      trim: true,
    },
    issueDate: {
      type: Date,
      required: [true, "La fecha de emisión es obligatoria"],
      default: Date.now,
    },

    issuer: {
      name: { type: String, required: true, trim: true },
      taxId: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      taxStatus: { type: String, required: true, trim: true },
    },

    receiver: {
      name: { type: String, required: true, trim: true },
      document: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      taxStatus: { type: String, required: true, trim: true },
    },

    details: {
      type: [invoiceDetailSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "La factura debe contener al menos un producto",
      },
    },

    subtotal: {
      type: Number,
      required: [true, "El subtotal es obligatorio"],
      min: [0, "El subtotal no puede ser negativo"],
    },
    total: {
      type: Number,
      required: [true, "El total es obligatorio"],
      min: [0, "El total no puede ser negativo"],
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "card", "transfer", "other"],
      required: [true, "El método de pago es obligatorio"],
    },

    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
    },

    qrCode: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["issued", "canceled"],
      default: "issued",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });

const InvoiceModel = mongoose.model("Invoice", invoiceSchema);

module.exports = InvoiceModel;
