const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require('morgan')
const connectDB = require("./config/db");

const userRoutes = require('./routes/user.routes')

dotenv.config();
connectDB();

const app = express();

//middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'))

//configuracion endpoints
app.use("/api", userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
