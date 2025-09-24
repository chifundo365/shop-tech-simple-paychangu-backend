const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const paymentRoutes = require("./routes/paymentRoutes");
const verifyTransactionJob = require("./jobs/verifyTransactionJob");

connectDB();
verifyTransactionJob.start();

const app = express();
app.use(cors());

app.use("/api", paymentRoutes);
app.get("/", (req, res) => res.send("Server running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
