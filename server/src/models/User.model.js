const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: {type: String, unique: true},
    phone: String,
    password: String,
    admin: {type: Boolean, default: false},
    active: {type: Boolean, default: true}
  },
  { timestamps: true }
);

const UserModel = mongoose.model("User", UserSchema);

module.exports = UserModel; 