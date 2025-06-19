const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: {type: String, unique: true},
    phone: String,
    image: String,
    admin: {type: Boolean, default: false}
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
