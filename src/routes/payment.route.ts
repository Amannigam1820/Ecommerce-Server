import express from "express";
import {
  allCoupons,
  applyDiscount,
  createPaymentIntent,
  deleteCoupon,
  newCoupon,
} from "../controllers/payment.controller.js";
import { adminOnly } from "../middleware/auth.middleware.js";

const app = express.Router();

app.post("/create", createPaymentIntent);
app.post("/coupon/new", adminOnly, newCoupon);

app.get("/discount", applyDiscount);

app.get("/coupon/all", adminOnly, allCoupons);

app.delete("/coupon/:id", adminOnly, deleteCoupon);

export default app;
