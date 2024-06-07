import express from "express"
import { deleteUser, getAllUsers, getUserById, newUser } from "../controllers/user.controller.js";
import { adminOnly } from "../middleware/auth.middleware.js";

const app = express.Router();

app.post("/new",newUser)
app.get("/all",adminOnly,getAllUsers)
app.get("/:id",getUserById)
app.delete("/:id",adminOnly,deleteUser)


export default app;