import express from "express";

import { adminOnly } from "../middleware/auth.middleware.js";
import {
  deleteProduct,
  getAllCategory,
  getAllProducts,
  getAllProductsFilter,
  getLatestProduct,
  getProductById,
  newProduct,
  updateProduct,
} from "../controllers/product.controller.js";
import { singleUpload } from "../middleware/multer.middlware.js";

const app = express.Router();

app.post("/new", adminOnly, singleUpload, newProduct);
app.get("/latest", getLatestProduct);
app.get("/category", getAllCategory);
app.get("/admin-products", adminOnly, getAllProducts);
app.get("/all",getAllProductsFilter)
app
  .route("/:id")
  .get(getProductById)
  .put(adminOnly, singleUpload, updateProduct)
  .delete(adminOnly, deleteProduct);

export default app;
