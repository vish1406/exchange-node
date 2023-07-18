import express from "express";
import authRoutes from "./routes/authRoutes.js";
import currencyRoutes from "./routes/currencyRoutes.js";
import ruleRoutes from "./routes/ruleRoutes.js";
import sportRoutes from "./routes/sportRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/sport", sportRoutes);
app.use("/currencies", currencyRoutes);
app.use("/rules", ruleRoutes);

export default app;
