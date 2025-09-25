const mongoose = require("mongoose");

//compra
const purchaseSchema = new mongoose.Schema(
  {
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
    date: { type: Date, default: Date.now },
    total: {
      type: Number,
      required: [true, "El total de la compra es obligatorio"],
      min: [0, "El total no puede ser negativo"],
    },
  },
  { _id: false }
);

//transacciones
const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["payment", "adjustment"],
      required: [true, "El tipo de transacción es obligatorio"],
    },
    amount: {
      type: Number,
      required: [true, "El monto de la transacción es obligatorio"],
      min: [0, "El monto no puede ser negativo"],
    },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

//cuenta corriente
const accountSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    creditLimit: {
      type: Number,
      min: [0, "El límite de crédito no puede ser negativo"],
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    transactions: { type: [transactionSchema], default: [] },
  },
  { _id: false }
);

//cliente
const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [50, "El nombre no puede superar los 50 caracteres"],
    },
    email: {
      type: String,
      required: [true, "El email es obligatorio"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
        "El formato de email es inválido",
      ],
    },
    phone: {
      type: String,
      trim: true,
      match: [
        /^\+?[0-9\s-]{7,20}$/,
        "El número de teléfono debe ser válido (ej: +54 381 1234567)",
      ],
    },
    addresses: {
      type: [String],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "Debe haber al menos una dirección",
      },
    },
    purchaseHistory: { type: [purchaseSchema], default: [] },
    account: { type: accountSchema, default: {} },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

customerSchema.index({ email: 1 }, { unique: true });

const CustomerModel = mongoose.model("Customer", customerSchema);

module.exports = CustomerModel;
