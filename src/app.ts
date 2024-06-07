import express from "express";
import NodeCache from "node-cache"
import {config} from "dotenv"
import morgan from "morgan"
import Stripe from "stripe";
import cors from "cors"

import { connectDB } from "./utils/features.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

// Importing Routes

import UserRouter from "./routes/user.route.js";
import ProductRouter from "./routes/product.route.js"
import OrderRouter from "./routes/order.route.js"
import PaymentRouter from "./routes/payment.route.js"
import DashboardRouter from "./routes/stats.route.js"




config({
  path:"./.env"
})
const port = process.env.PORT || 4000;
const mongo_uri = process.env.MONGO_URI || ""
const stripe_key = process.env.STRIPE_KEY || ""



connectDB(mongo_uri);

export const stripe = new Stripe(stripe_key)

export const myCache = new NodeCache()




const app = express();
app.use(morgan("dev"))
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({ message: "Default Route " });
});

// Using Route
app.use("/api/v1/user", UserRouter);
app.use("/api/v1/product", ProductRouter)
app.use("/api/v1/order",OrderRouter)
app.use("/api/v1/payment",PaymentRouter)
app.use("/api/v1/dashboard",DashboardRouter)

app.use("/uploads",express.static("uploads"));
app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
