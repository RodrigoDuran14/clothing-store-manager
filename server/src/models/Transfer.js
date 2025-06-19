const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema(
  {
    originPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    targetPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: Number,
    date: Date,
    method: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transfer", transferSchema);
