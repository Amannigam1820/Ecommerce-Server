import { stripe } from "../app.js";
import { TryCatch } from "../middleware/error.middleware.js";
import { Coupon } from "../models/coupon.models.js";
import ErrorHandler from "../utils/utility-class.js";

export const createPaymentIntent = TryCatch(async (req, res, next) => {
  const { amount } = req.body;
  if (!amount) {
    return next(new ErrorHandler("Please enter amount", 404));
  }
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Number(amount) * 100,
    currency: "inr",
  });
  return res.status(200).json({
    success: true,
    clientSecret:paymentIntent.client_secret
  });
});

export const newCoupon = TryCatch(async (req, res, next) => {
  const { coupon, amount } = req.body;

  if (!coupon || !amount) {
    return next(new ErrorHandler("Please enter both coupon and amount", 404));
  }

  await Coupon.create({ code: coupon, amount });
  return res.status(201).json({
    success: true,
    message: `Coupon ${coupon} Created Successfully`,
  });
});

export const applyDiscount = TryCatch(async (req, res, next) => {
  const { coupon } = req.query;

  const discount = await Coupon.findOne({ code: coupon });

  if (!discount) {
    return next(
      new ErrorHandler("Invalid Coupon code or Coupon Code Expire", 400)
    );
  }
  return res.status(200).json({
    success: true,
    discount: discount.amount,
  });
});

export const allCoupons = TryCatch(async (req, res, next) => {
  const coupon = await Coupon.find();

  if (!coupon) {
    return next(new ErrorHandler("Coupons Not Found", 400));
  }
  return res.status(200).json({
    success: true,
    coupon,
  });
});
export const deleteCoupon = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const coupon = await Coupon.findByIdAndDelete(id);

  if (!coupon) {
    return next(new ErrorHandler("Invalid Coupon ID", 400));
  }

  return res.status(200).json({
    success: true,
    message: `Coupon ${coupon?.code} Deleted Successfully `,
  });
});
