import express from "express";
import {
  allOrders,
  deleteOrder,
  getSingleOrder,
  myOrders,
  newOrder,
  processOrder,
} from "../controllers/order.controller.js";
import { adminOnly } from "../middleware/auth.middleware.js";

const app = express.Router();

app.post("/new", newOrder);
app.get("/my", myOrders);
app.get("/all", adminOnly, allOrders);
app.route("/:id").get(getSingleOrder).put(adminOnly, processOrder).delete(adminOnly,deleteOrder);

export default app;
