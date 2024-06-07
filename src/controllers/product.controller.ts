import { rm } from "fs";
import { TryCatch } from "../middleware/error.middleware.js";
import { Product } from "../models/product.models.js";
import ErrorHandler from "../utils/utility-class.js";
import { Request } from "express";
import { BaseQuery, SearchRequestQuery } from "../types/types.js";
import { myCache } from "../app.js";
import { invalidatesCache } from "../utils/features.js";

export const getLatestProduct = TryCatch(async (req, res, next) => {
  let products;

  if (myCache.has("latest-products")) {
    products = JSON.parse(myCache.get("latest-products") as string);
  } else {
    products = await Product.find({}).sort({ createdAt: -1 }).limit(5);
    myCache.set("latest-products", JSON.stringify(products));
  }
  // console.log(myCache.has("latest-product"));

  return res.status(201).json({
    success: true,
    products,
  });
});

export const getAllCategory = TryCatch(async (req, res, next) => {
  let categories;
  if (myCache.has("categories")) {
    categories = JSON.parse(myCache.get("categories") as string);
  } else {
    categories = await Product.distinct("category");
    myCache.set("categories", JSON.stringify(categories));
  }

  return res.status(201).json({
    success: true,
    categories,
  });
});

export const getAllProducts = TryCatch(async (req, res, next) => {
  let products;
  if (myCache.has("all-products")) {
    products = JSON.parse(myCache.get("all-products") as string);
  } else {
    products = await Product.find({});
    myCache.set("all-products", JSON.stringify(products));
  }

  return res.status(201).json({
    success: true,
    products,
  });
});

export const getProductById = TryCatch(async (req, res, next) => {
  const id = req.params.id;
  let product;
  if (myCache.has(`product-${id}`)) {
    product = JSON.parse(myCache.get(`product-${id}`) as string);
  } else {
    product = await Product.findById(id);
    if (!product) {
      return next(new ErrorHandler("Product not found", 400));
    }
    myCache.set(`product-${id}`, JSON.stringify(product));
  }
  return res.status(201).json({
    success: true,
    product,
  });
});

export const newProduct = TryCatch(async (req, res, next) => {
  const { name, price, stock, category } = req.body;
  const photo = req.file;
  if (!photo) {
    return next(new ErrorHandler("Please Add Photo of the product", 400));
  }
  if (!name || !price || !stock || !category) {
    rm(photo.path, () => {
      console.log("Deleted");
    });

    return next(
      new ErrorHandler("Please Add all the detail of the product", 400)
    );
  }
  await Product.create({
    name,
    price,
    stock,
    category: category.toLowerCase(),
    photo: photo.path,
  });

  invalidatesCache({ product: true, admin: true });

  return res.status(201).json({
    success: true,
    message: "Product Created Successfully",
  });
});

export const updateProduct = TryCatch(async (req, res, next) => {
  const id = req.params.id;
  const { name, price, stock, category } = req.body;
  const photo = req.file;

  const product = await Product.findById(id);
  if (!product) {
    return next(
      new ErrorHandler("Product not found || Invalid Product Id", 404)
    );
  }
  if (photo) {
    rm(product.photo, () => {
      console.log("old photo deleted");
    });
    product.photo = photo.path;
  }
  if (name) {
    product.name = name;
  }
  if (price) {
    product.price = price;
  }
  if (stock) {
    product.stock = stock;
  }
  if (category) {
    product.category = category;
  }

  await product.save();
  invalidatesCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(200).json({
    success: true,
    message: "Product Updated Successfully",
  });
});

export const deleteProduct = TryCatch(async (req, res, next) => {
  const id = req.params.id;
  const product = await Product.findById(id);
  if (!product) {
    return next(new ErrorHandler("Product not found", 400));
  }
  rm(product.photo, () => {
    console.log("Product Photo Deleted");
  });
  await product.deleteOne();
  invalidatesCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });
  return res.status(201).json({
    success: true,
    message: "Product deleted Successfully",
  });
});

export const getAllProductsFilter = TryCatch(
  async (req: Request<{}, {}, {}, SearchRequestQuery>, res, next) => {
    const { search, sort, price, category } = req.query;

    const page = Number(req.query.page) || 1;

    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
    const skip = limit * (page - 1);

    const baseQuery: BaseQuery = {};

    if (search) {
      baseQuery.name = {
        $regex: search,
        $options: "i",
      };
    }
    if (price) {
      baseQuery.price = {
        $lte: Number(price),
      };
    }
    if (category) {
      baseQuery.category = category;
    }

    const productPromise = Product.find(baseQuery)
      .sort(sort && { price: sort === "asc" ? 1 : -1 })
      .limit(limit)
      .skip(skip);

    const [products, filterOnlyProduct] = await Promise.all([
      productPromise,
      Product.find(baseQuery),
    ]);

    const totalPage = Math.ceil(filterOnlyProduct.length / limit);
    return res.status(200).json({
      success: true,
      products,
      totalPage,
    });
  }
);
