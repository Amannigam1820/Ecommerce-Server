import express from "express";
import {
  getBarCharts,
  getDashboardStats,
  getLineCharts,
  getPieCharts,
} from "../controllers/stats.controller.js";
import { adminOnly } from "../middleware/auth.middleware.js";

const app = express.Router();

app.get("/stats", adminOnly, getDashboardStats);
app.get("/pie", adminOnly, getPieCharts);
app.get("/bar", adminOnly, getBarCharts);
app.get("/line", adminOnly, getLineCharts);

export default app;
