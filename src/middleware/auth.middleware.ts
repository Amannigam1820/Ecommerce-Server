import { User } from "../models/user.models.js";
import ErrorHandler from "../utils/utility-class.js";
import { TryCatch } from "./error.middleware.js";

export const adminOnly = TryCatch(async (req, res, next) => {
  const { id } = req.query;
  if (!id) {
    return next(new ErrorHandler("Please login first to access this route", 401));
  }
  const user = await User.findById(id);
  if (!user) {
    return next(new ErrorHandler("User Not found with this Id", 401));
  }
  if (user.role !== "admin") {
    return next(
      new ErrorHandler(
        "User with this id is not authorized to access this route",
        401
      )
    );
  }

  next();
});
