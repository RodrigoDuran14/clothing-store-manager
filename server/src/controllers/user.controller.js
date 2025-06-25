const UserModel = require("../models/User.model");
const bcrypt = require("bcrypt");

const getUserList = async (req, res, next) => {
  try {
    const allUsers = await UserModel.find();

    res.status(200).send(allUsers);
  } catch (error) {
    next(error);
  }
};

const postUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, admin } = req.body;

    if ((!name, !email, !phone, !password)) {
      return res
        .status(404)
        .send({ error: "Todos los campos son obligatorios" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new UserModel({
      name,
      email,
      phone,
      password: hashedPassword,
      admin,
      active,
    });

    await newUser.save();
    res.status(201).send(newUser);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const update = req.body;

    if (update.password) {
      const hashedPassword = await bcrypt.hash(update.password, 10);
      update.password = hashedPassword;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).send({ error: "Usuario no encontrado" });
    }

    res.status(200).send(updatedUser);
  } catch (error) {
    next(error);
  }
};

const updateActiveUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findById(id);

    if (!user) return res.status(404).send({ error: "Usuario no encontrado" });

    user.active = !user.active;

    await user.save();
    res.status(200).send(user);
  } catch (error) {
    next(error);
  }
};

const updateAdminUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findById(id);

    if (!user) {
      return res.status(404).send({ error: "Usuario no encontrado" });
    }
    if (user.admin) {
      user.password = "";
    }

    user.admin = !user.admin;
    await user.save();
    res.status(200).send(user);
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findById({ _id: id });

    if (!empleado) {
      return res.status(404).send({ error: "Usuario no encontrado" });
    }

    res.status(200).send(user);
  } catch (error) {
    next(error);
  }
};

const findUser = async (req, res, next) => {
  try {
    const { name, email, phone } = req.query;

    let userQuery = {};
    if (name) userQuery.name = new RegExp(name, "i");
    if (email) userQuery.email = new RegExp(email, "i");
    if (phone) userQuery.phone = new RegExp(phone, "i");

    const user = await UserModel.find(userQuery)

    if(!user){
      return res.status(404).send({message: "Usuario no encontrado"})
    }

    res.status(200).send(user)
  } catch (error) {
    next(error);
  };
}

module.exports = {
  getUserList,
  postUser,
  updateUser,
  updateActiveUser,
  updateAdminUser,
  getUserById,
  findUser
};