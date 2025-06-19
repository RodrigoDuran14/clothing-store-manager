const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

//configuracion endpoints
app.use("/api/users", require("./routes/user.routes"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
