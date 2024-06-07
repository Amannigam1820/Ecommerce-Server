import { myCache } from "../app.js";
import { TryCatch } from "../middleware/error.middleware.js";
import { Order } from "../models/order.models.js";
import { Product } from "../models/product.models.js";
import { User } from "../models/user.models.js";
import {
  calculatePercentage,
  getChartData,
  getInventories,
} from "../utils/features.js";

export const getDashboardStats = TryCatch(async (req, res, next) => {
  let stats = {};

  const key = "admin-stats";
  if (myCache.has(key)) {
    stats = JSON.parse(myCache.get(key) as string);
  } else {
    const today = new Date();
    const sixMonthAgo = new Date();
    sixMonthAgo.setMonth(sixMonthAgo.getMonth() - 6);

    const thisMonth = {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: today,
    };

    const lastMonth = {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    };

    const thisMonthProductsPromise = Product.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });
    const lastMonthProductsPromise = Product.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });

    const thisMonthUsersPromise = User.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });
    const lastMonthUsersPromise = User.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });

    const thisMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });
    const lastMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });

    const lastSixMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: sixMonthAgo,
        $lte: today,
      },
    });

    const latestTransactionPromise = Order.find({})
      .select(["orderItems", "discount", "total", "status"])
      .limit(4);

    const [
      thisMonthProducts,
      thisMonthUsers,
      thisMonthOrders,
      lastMonthProducts,
      lastMonthUsers,
      lastMonthOrders,
      productsCount,
      usersCount,
      allOrders,
      lastSixMonthOrders,
      categories,
      femaleUserCount,
      maleUserCount,
      otherUserCount,
      latestTransaction,
    ] = await Promise.all([
      thisMonthProductsPromise,
      thisMonthUsersPromise,
      thisMonthOrdersPromise,
      lastMonthProductsPromise,
      lastMonthUsersPromise,
      lastMonthOrdersPromise,
      Product.countDocuments(),
      User.countDocuments(),
      Order.find({}).select("total"),
      lastSixMonthOrdersPromise,
      Product.distinct("category"),
      User.countDocuments({ gender: "female" }),
      User.countDocuments({ gender: "male" }),
      User.countDocuments({ gender: "other" }),
      latestTransactionPromise,
    ]);

    const thisMonthRevenue = thisMonthOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    const lastMonthRevenue = lastMonthOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    const changePercent = {
      revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),
      product: calculatePercentage(
        thisMonthProducts.length,
        lastMonthProducts.length
      ),
      user: calculatePercentage(thisMonthUsers.length, lastMonthUsers.length),
      order: calculatePercentage(
        thisMonthOrders.length,
        lastMonthOrders.length
      ),
    };

    const revenue = allOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    const counts = {
      revenue,
      product: productsCount,
      user: usersCount,
      order: allOrders.length,
    };

    const orderMonthCount = new Array(6).fill(0);
    const orderMonthlyRevenue = new Array(6).fill(0);

    lastSixMonthOrders.forEach((order) => {
      const creationDate = order.createdAt;
      const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
      // console.log("today_getmonth = ", today.getMonth());
      // console.log("creationdate_month = ", creationDate.getMonth());

      // console.log("creatin-date =", creationDate);
      // console.log("Month-Diff =", monthDiff);

      if (monthDiff < 6) {
        orderMonthCount[6 - monthDiff - 1] += 1;
        orderMonthlyRevenue[6 - monthDiff - 1] += order.total;
      }

      // console.log("orderMonthCount = ",orderMonthCount);
      // console.log("orderMonthlyRevenue = ",orderMonthlyRevenue);
    });

    const categoryCount = await getInventories({
      categories,
      productsCount,
    });

    const userRatio = {
      male: maleUserCount,
      female: femaleUserCount,
      other: otherUserCount,
    };

    const modifiedLatestTransaction = latestTransaction.map((i) => ({
      _id: i._id,
      discount: i.discount,
      amount: i.total,
      quantity: i.orderItems.length,
      status: i.status,
    }));

    stats = {
      categoryCount,

      changePercent,
      counts,
      chart: {
        order: orderMonthCount,
        revenue: orderMonthlyRevenue,
      },
      userRatio,
      latestTransaction: modifiedLatestTransaction,
    };
    myCache.set(key, JSON.stringify(stats));
  }
  return res.status(200).json({
    success: true,
    stats,
  });
});

export const getPieCharts = TryCatch(async (req, res, next) => {
  let charts;
  const key = "admin-piechart";
  if (myCache.has(key)) {
    charts = JSON.parse(myCache.get(key) as string);
  } else {
    const allOrderPromise = Order.find({}).select([
      "total",
      "discount",
      "subtotal",
      "tax",
      "shippingCharges",
    ]);

    const [
      processingOrder,
      shippedOrder,
      deliverOrder,
      categories,
      productsCount,
      productOutOfStock,
      allOrders,
      allUsers,
      adminUsers,
      customerUsers,
    ] = await Promise.all([
      Order.countDocuments({ status: "Processing" }),
      Order.countDocuments({ status: "Shipped" }),
      Order.countDocuments({ status: "Delivered" }),
      Product.distinct("category"),
      Product.countDocuments(),
      Product.countDocuments({ stock: 0 }),
      allOrderPromise,
      User.find({}).select(["dob"]),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "user" }),
    ]);

    //console.log(productOutOfStock);
    

    const orderFullfillment = {
      processing: processingOrder,
      shipped: shippedOrder,
      delivered: deliverOrder,
    };

    const productCategoriesRatio = await getInventories({
      categories,
      productsCount,
    });

    const stockAvailability = {
      inStock: productsCount - productOutOfStock,
      outOfStock: productOutOfStock,
    };

    const grossIncome = allOrders.reduce(
      (prev, order) => prev + (order.total || 0),
      0
    );

    const totalDiscount = allOrders.reduce(
      (prev, order) => prev + (order.discount || 0),
      0
    );

    const productionCost = allOrders.reduce(
      (prev, order) => prev + (order.shippingCharges || 0),
      0
    );

    const burnt = allOrders.reduce((prev, order) => prev + (order.tax || 0), 0);

    const marketingCost = Math.round(grossIncome * (30 / 100));

    const netMargin =
      grossIncome - totalDiscount - productionCost - burnt - marketingCost;

    const revenueDistribution = {
      netMargin,
      discount: totalDiscount,
      productionCost: productionCost,
      burnt,
      marketingCost,
    };

    const adminCustomer = {
      admin: adminUsers,
      customer: customerUsers,
    };

    const UsersAgeGroup = {
      Teenagers: allUsers.filter((i) => i.age < 20).length,
      Adults: allUsers.filter((i) => i.age > 20 && i.age < 50).length,
      Old: allUsers.filter((i) => i.age > 50).length,
    };

    charts = {
      orderFullfillment,
      productCategoriesRatio,
      stockAvailability,
      revenueDistribution,
      UsersAgeGroup,
      adminCustomer,
    };

    myCache.set(key, JSON.stringify(charts));
  }

  return res.status(200).json({
    success: true,
    charts,
  });
});

export const getBarCharts = TryCatch(async (req, res, next) => {
  let charts;
  const key = "admin-bar-charts";
  if (myCache.has(key)) {
    charts = JSON.parse(myCache.get(key) as string);
  } else {
    const today = new Date();

    const sixMonthAgo = new Date();
    sixMonthAgo.setMonth(sixMonthAgo.getMonth() - 6);

    const twelveMonthAgo = new Date();
    twelveMonthAgo.setMonth(twelveMonthAgo.getMonth() - 6);

    const lastsixMonthProductPromise = Product.find({
      createdAt: {
        $gte: sixMonthAgo,
        $lte: today,
      },
    }).select("createdAt");
    const lastsixMonthUserPromise = User.find({
      createdAt: {
        $gte: sixMonthAgo,
        $lte: today,
      },
    }).select("createdAt");
    const lasttwelveMonthOrderPromise = Order.find({
      createdAt: {
        $gte: twelveMonthAgo,
        $lte: today,
      },
    }).select("createdAt");

    const [products, users, orders] = await Promise.all([
      lastsixMonthProductPromise,
      lastsixMonthUserPromise,
      lasttwelveMonthOrderPromise,
    ]);

    const productCounts = getChartData({ length: 6, today, docArr: products });

    const userCounts = getChartData({ length: 6, today, docArr: users });
    const orderCounts = getChartData({ length: 12, today, docArr: orders });

    charts = {
      users: userCounts,
      products: productCounts,
      orders: orderCounts,
    };

    myCache.set(key, JSON.stringify(charts));
  }
  return res.status(200).json({
    success: true,
    charts,
  });
});

export const getLineCharts = TryCatch(async (req,res,next) => {
    let charts;
    const key = "admin-line-charts";
    if (myCache.has(key)) {
      charts = JSON.parse(myCache.get(key) as string);
    } else {
      const today = new Date();
  
     
      const twelveMonthAgo = new Date();
      twelveMonthAgo.setMonth(twelveMonthAgo.getMonth() - 6);

      const baseQuery = {
        
            createdAt: {
              $gte: twelveMonthAgo,
              $lte: today,
            }

      }
     const [products, users, orders] = await Promise.all([
        Product.find(baseQuery).select("createdAt"),
        User.find(baseQuery).select("createdAt"),
        Order.find(baseQuery).select(["createdAt","discount","total"]),
      ]);


      
  
      const productCounts = getChartData({ length: 12, today, docArr: products });
      const userCounts = getChartData({ length: 12, today, docArr: users });
      const discount = getChartData({ length: 12, today, docArr: orders,property:"discount" });
      const revenue = getChartData({ length: 12, today, docArr: orders,property:"total" });

    
      
  
      charts = {
        users: userCounts,
        products: productCounts,
        discount,
        revenue
      };
  
      myCache.set(key, JSON.stringify(charts));
    }
    return res.status(200).json({
      success: true,
      charts,
    });
});
