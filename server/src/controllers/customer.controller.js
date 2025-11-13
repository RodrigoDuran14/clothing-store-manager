const CustomerModel = require("../models/Customer.model");
const mongoose = require("mongoose");

const postCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, addresses } = req.body;

    const newCustomer = new CustomerModel({
      name,
      email,
      phone,
      addresses,
    });

    await newCustomer.save();

    res
      .status(201)
      .save({ message: "Cliente creado correctamente", newCustomer });
  } catch (error) {
    next(error);
  }
};

const getCustomersList = async (req, res, next) => {
  try {
    const allCustomers = await CustomerModel.find();

    res.status(200).send(allCustomers);
  } catch (error) {
    next(error);
  }
};

const findCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, active } = req.query;
    const filter = {};

    if (name) filter.name = { $regex: name, $options: "i" };
    if (email) filter.email = { $regex: email, $options: "i" };
    if (phone) filter.phone = { $regex: phone, $options: "i" };
    if (active !== undefined) filter.active = active === "true";

    const customers = await CustomerModel.find(filter);

    if (!customers.length) {
      return res.status(404).send({ message: "No se encontraron clientes" });
    }

    res.status(200).send(customers);
  } catch (error) {
    next(error);
  }
};

const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await CustomerModel.findById({ _id: id });

    if (!customer) {
      return res.status(404).send({ error: "Cliente no encontrado" });
    }

    res.status(200).json(customer);
  } catch (error) {
    next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const updatedCustomer = await CustomerModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );

    if (!updatedCustomer) {
      return res.status(404).send({ error: "Cliente no encontrado" });
    }

    res
      .status(200)
      .send({ message: "Cliente actualizado correctamente", updatedCustomer });
  } catch (error) {
    next(error);
  }
};

const updateActiveCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await CustomerModel.findById(id);

    if (!customer)
      return res.status(404).send({ error: "Cliente no encontrado" });

    customer.active = !customer.active;

    await customer.save();

    res.status(200).send(customer);
  } catch (error) {
    next(error);
  }
};

const addTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, amount } = req.body;

    if (!type || !amount)
      return res.status(400).json({ error: "type y amount son obligatorios" });

    if (!["payment", "adjustment"].includes(type)) {
      return res.status(400).send({ error: "Tipo de transacción inválida" });
    }

    const customer = await CustomerModel.findById(id);
    if (!customer)
      return res.status(404).send({ error: "Cliente no encontrado" });

    //registra la transaccion
    customer.account.transactions.push({ type, amount });
    //actualiza balance
    customer.account.balance += type === "payment" ? -amount : amount;

    await customer.save();

    res
      .status(200)
      .send({ message: "Transacción agregada correctamente", customer });
  } catch (error) {
    next(error);
  }
};

const updateCreditLimit = async (req, res, next) => {
  try {
    const { creditLimit } = req.body;
    const { id } = req.params;
    const customer = await CustomerModel.findById(id);

    if (creditLimit == null || creditLimit < 0)
      return res.status(400).json({ error: "Límite de crédito inválido" });

    if (!customer)
      return res.status(404).send({ error: "Cliente no encontrado" });

    customer.account.creditLimit = creditLimit;

    await customer.save();
    res
      .status(200)
      .send({ message: "Límite de crédito actualizado", customer });
  } catch (error) {
    next(error);
  }
};

const addPurchase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { saleId, total } = req.body;

    if (!saleId || !total)
      return res.status(400).json({ error: "saleId y total son obligatorios" });

    const customer = await CustomerModel.findById(id);
    if (!customer)
      return res.status(404).send({ error: "Cliente no encontrado" });

    customer.purchaseHistory.push({ saleId, total });
    customer.account.balance += total; //aumenta la deuda
    await customer.save();
    res
      .status(200)
      .send({ message: "Compra agregada correctamente", customer });
  } catch (error) {
    next(error);
  }
};

const getPurchaseHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await CustomerModel.findById(id);

    if (!customer)
      return res.status(404).send({ error: "Cliente no encontrado" });

    res.status(200).send(customer.purchaseHistory.reverse());
  } catch (error) {
    next(error);
  }
};

const getBalance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await CustomerModel.findById(id);
    if (!customer)
      return res.status(404).send({ error: "Cliente no encontrado" });

    const { balance, creditLimit } = customer.account;

    const availableCredit = creditLimit - balance;

    res.status(200).send({ balance, creditLimit, availableCredit });
  } catch (error) {
    next(error);
  }
};

const getTopCustomers = async (req, res, next) => {
  try {
    const { limite } = req.body;

    const topCustomers = await CustomerModel.aggregate([
      { $unwind: "$purchaseHistory" },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          email: { $first: "$email" },
          totalSpent: { $sum: "$purchaseHistory.total" }, //total gastado
          purchaseCount: { $sum: 1 }, //cantidad de compras
          lastPurchaseDate: { $max: "$purchaseHistory.date" }, //ultimacompra
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: limite },
    ]);

    res.status(200).send(topCustomers);
  } catch (error) {
    next(error);
  }
};

const getDebtors = async (req, res, next) => {
  try {
    const debtors = await CustomerModel.find({ "account.balance": { $gt: 0 } })
      .select("name email account.balance")
      .sort({ "account.balance": -1 });

    res.status(200).send(debtors);
  } catch (error) {
    next(error);
  }
};

const getMonthlySummary = async (req, res, next) => {
  try {
    const summary = await CustomerModel.aggregate([
      { $unwind: "$purchaseHistory" },
      {
        $group: {
          _id: { $month: "$purchaseHistory.date" },
          totalSales: { $sum: "$purchaseHistory.total" },
          purchases: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).send(summary);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  postCustomer,
  getCustomersList,
  findCustomer,
  getCustomerById,
  updateCustomer,
  updateActiveCustomer,
  addTransaction,
  updateCreditLimit,
  addPurchase,
  getPurchaseHistory,
  getBalance,
  getTopCustomers,
  getDebtors,
  getMonthlySummary,
};
