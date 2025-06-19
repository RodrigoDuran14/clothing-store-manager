const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB conectado correctamente");
  } catch (error) {
    console.log("Error al conectar a MongoDB: ", error);
  }
};

module.exports = connectDB;
