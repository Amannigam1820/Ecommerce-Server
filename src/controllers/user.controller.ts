import { NextFunction, Request, Response } from "express";
import { User } from "../models/user.models.js";
import { NewUserRequestBody } from "../types/types.js";
import ErrorHandler from "../utils/utility-class.js";
import { TryCatch } from "../middleware/error.middleware.js";

export const newUser = TryCatch(
  async (
    req: Request<{}, {}, NewUserRequestBody>,
    res: Response,
    next: NextFunction
  ) => {
    const { name, email, photo, gender, _id, dob } = req.body;
    let user = await User.findById(_id);

    if (user) {
      return res.status(200).json({
        success: true,
        message: `Welcome, ${user.name}`,
      });
    }

    if (!_id || !name || !email || !photo || !gender || !dob) {
      return next(new ErrorHandler("Please Add All Field", 400));
    }

    user = await User.create({
      name,
      email,
      photo,
      gender,
      _id,
      dob: new Date(dob),
    });
    return res.status(201).json({
      success: true,
      message: `Welcome, ${user.name}`,
    });
  }
);

export const getAllUsers = TryCatch(async (req, res, next) => {
  const user = await User.find({});
  return res.status(200).json({
    success: true,
    user,
  });
});

export const getUserById = TryCatch(async (req, res, next) => {
  const id = req.params.id;
  const user = await User.findById(id);

  if (!user) {
    return next(new ErrorHandler("Invalid User Id", 400));
  }
  return res.status(200).json({
    success: true,
    user,
  });
});

export const deleteUser = TryCatch(async (req, res, next) => {
  const id = req.params.id;
  const user = await User.findById(id);
  if (!user) {
    return next(new ErrorHandler(`Invalid User Id, ${id}`, 400));
  }
  await user.deleteOne();
  return res.status(200).json({
    success: true,
    message: "User Deleted Successfully",
  });
});
