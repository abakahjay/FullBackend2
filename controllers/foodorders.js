const mongoose = require("mongoose");
const FoodOrders = require("../models/FoodOrders");
const { ObjectId } = require("mongodb");
const { UnauthenticatedError, BadRequestError, NotFoundError } = require("../errors");
const { StatusCodes } = require("http-status-codes");
const User = require("../models/User");
const Meal = require("../models/Meals");

/**
 * Worker/Admin: Place a new order
 */
exports.createOrder = async (req, res) => {
    const { userId, mealId, quantity } = req.body;

    if (!userId) throw new BadRequestError("Please provide userId");
    if (!mealId) throw new BadRequestError("Please provide mealId");

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError(`No User found with id:${userId}`);

    const meal = await Meal.findById(mealId);
    if (!meal) throw new NotFoundError(`No Meal found with id:${mealId}`);

    // ✅ Enforce max 2 meals per user per day
    const today = new Date();
    today.setHours(0, 0, 0, 0); // midnight today
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const ordersToday = await FoodOrders.countDocuments({
        userId,
        createdAt: { $gte: today, $lt: tomorrow },
    });
    // console.log(user.role)

    if (ordersToday >= 1 &&user.role !== "admin") {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ error: "You can only order a maximum of 1 meal per day." });
    }

    const qty = quantity || 1;

    // ✅ Convert priceCents to cedis
    const pricePerMeal = meal.priceCents / 100;
    const totalPrice = pricePerMeal * qty;

    // ✅ Determine role automatically from user
    const orderedByRole = user.role || "worker";

    const order = new FoodOrders({
        userId,
        mealId,
        mealName: meal.name, // ✅ REQUIRED
        quantity: qty,
        pricePerMeal,        // ✅ REQUIRED
        totalPrice,          // ✅ REQUIRED
        orderedByRole,       // ✅ REQUIRED
        date: new Date(),    // auto-set
    });

    await order.save();

    console.log(
        "\x1b[34m%s\x1b[0m",
        `User: ${user.name} (${orderedByRole}) ordered ${qty} x ${meal.name} (₵${totalPrice.toFixed(2)})`
    );

    res.status(StatusCodes.CREATED).json({ order, user });
};


/**
 * Worker: Get own orders
 */
exports.getUserOrders = async (req, res) => {
    const { userId } = req.params;

    if (!userId || userId === "null" || userId === "undefined") {
        throw new BadRequestError("Please provide userId");
    }

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError(`No User found with id:${userId}`);

    const orders = await FoodOrders.find({ userId }).sort({ createdAt: -1 });

    const totalSpent = orders.reduce((sum, o) => sum + o.totalPrice, 0);

    console.log("\x1b[36m%s\x1b[0m", `${user.username} orders retrieved`);

    res.status(StatusCodes.OK).json({
        message: `${user.name} orders found`,
        nbHits: orders.length,
        totalSpent,
        orders,
    });
};


/**
 * Caterer/Admin: Get all orders
 */
exports.getAllOrders = async (req, res) => {
    const orders = await FoodOrders.find()
        .populate("mealId")
        .populate("userId", "firstName lastName email profile_picture_id");

    res.status(StatusCodes.OK).json({ nbHits: orders.length, orders });
};

/**
 * Admin: Get total money spent by everyone
 */
exports.getTotalSpent = async (req, res) => {
    const orders = await FoodOrders.find();
    const total = orders.reduce((sum, o) => sum + o.totalPrice, 0);

    res.status(StatusCodes.OK).json({ total });
};

/**
 * Delete order (Admin or the same Worker)
 */
exports.deleteOrder = async (req, res) => {
    const { orderId } = req.params;
    if (!orderId) throw new BadRequestError("Please provide orderId");

    const order = await FoodOrders.findOneAndDelete({ _id: new ObjectId(orderId) });
    if (!order) throw new NotFoundError(`No order found with id:${orderId}`);

    console.log("\x1b[31m%s\x1b[0m", `Order ${orderId} deleted`);

    res.status(StatusCodes.OK).json({ text: "Order deleted successfully!", order });
};

/**
 * Caterer/Admin: Update Order Status
 */
exports.updateOrderStatus = async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!orderId) throw new BadRequestError("Please provide orderId");
    if (!status) throw new BadRequestError("Please provide a status");

    // ✅ Only allow valid status values
    const validStatuses = ["pending", "preparing", "completed"];
    if (!validStatuses.includes(status)) {
        throw new BadRequestError(
            `Invalid status. Allowed values: ${validStatuses.join(", ")}`
        );
    }

    const order = await FoodOrders.findById(orderId);
    if (!order) throw new NotFoundError(`No order found with id:${orderId}`);

    order.status = status;
    await order.save();

    console.log("\x1b[33m%s\x1b[0m", `Order ${orderId} status updated to ${status}`);

    res.status(StatusCodes.OK).json({ message: "Order status updated", order });
};

/* -------------------------------------------------
   NEW ENDPOINTS: ADMIN & CATERER DASHBOARDS
--------------------------------------------------- */

/**
 * Admin Dashboard Data
 */
exports.getAdminData = async (req, res) => {
    const users = await User.find({}, "firstName lastName email profilePic role profile_picture_id");
    const orders = await FoodOrders.find();

    // Group orders daily & cumulative
    const dailyMap = {};
    let cumulative = 0;

    orders.forEach((o) => {
        const dateKey = new Date(o.createdAt).toISOString().split("T")[0];
        if (!dailyMap[dateKey]) dailyMap[dateKey] = { orders: 0, uniqueUsers: new Set() };
        dailyMap[dateKey].orders += 1;
        dailyMap[dateKey].uniqueUsers.add(o.userId.toString());
        cumulative++;
    });

    const dailyStats = Object.keys(dailyMap).map((date) => ({
        date,
        totalOrders: dailyMap[date].orders,
        uniquePeople: dailyMap[date].uniqueUsers.size,
    }));

    const userData = users.map((u) => {
        const userOrders = orders.filter((o) => o.userId.toString() === u._id.toString());
        return {
            name: `${u.firstName} ${u.lastName}`,
            email: u.email,
            profilePic: u.profilePic || "",
            profile_picture_id: u.profile_picture_id || "",
            totalOrders: userOrders.length,
            cumulative,
        };
    });
    console.log(userData)

    res.status(StatusCodes.OK).json(userData);
};

/**
 * Caterer Dashboard Data
 */
exports.getCatererData = async (req, res) => {
    const orders = await FoodOrders.find().populate("userId", "firstName lastName role profile_picture_id");

    const mealMap = {};

    orders.forEach((o) => {
        if (!mealMap[o.mealName]) {
            mealMap[o.mealName] = { totalQuantity: 0, orderedBy: [] };
        }
        mealMap[o.mealName].totalQuantity += o.quantity;
        mealMap[o.mealName].orderedBy.push({
            name: `${o.userId.firstName} ${o.userId.lastName}`,
            role: o.userId.role,
        });
    });

    const mealData = Object.keys(mealMap).map((meal) => ({
        mealName: meal,
        totalQuantity: mealMap[meal].totalQuantity,
        orderedBy: mealMap[meal].orderedBy,
    }));

    res.status(StatusCodes.OK).json(mealData);
};




// ... your existing methods (createOrder, getUserOrders, etc.)

/**
 * Admin: get analytics data for dashboard.
 * Returns an object:
 * {
 *   users: [ { _id, name, email, profilePic, ordersCount, totalSpent } ],
 *   ordersByUser: [ { _id, name, profilePic, meals: [ { name, qty } ], totalMeals, feedback } ]
 * }
 */
exports.getAdminAnalytics = async (req, res) => {
  // Fetch all users
  const users = await User.find({}, "firstName lastName email profilePic profile_picture_id");

  // Fetch all orders, with feedback if you have a Feedback model
  const orders = await FoodOrders.find().lean(); // lean to get plain JS objects

  // If you have a Feedback model, load them too
  // e.g. const Feedback = require("../models/Feedback");
  // const feedbacks = await Feedback.find().lean();

  // Build a map of orders grouped by user
  const ordersByUserMap = {};

  orders.forEach((order) => {
    const uid = order.userId.toString();
    if (!ordersByUserMap[uid]) {
      ordersByUserMap[uid] = {
        _id: uid,
        meals: {},
        totalMeals: 0,
        // feedback boolean: you can decide logic; here default false
        feedback: false,
      };
    }
    const rec = ordersByUserMap[uid];
    // Count meal quantity
    const mealName = order.mealName || "Unknown";
    rec.meals[mealName] = (rec.meals[mealName] || 0) + order.quantity;
    rec.totalMeals += order.quantity;
    // TODO: check feedbacks to set feedback = true if any feedback exists for this order
  });

  // Convert meals map to array, assemble ordersByUser
  const ordersByUser = Object.values(ordersByUserMap).map((rec) => {
    return {
      _id: rec._id,
      name: (() => {
        const u = users.find((u) => u._id.toString() === rec._id);
        return u ? `${u.firstName} ${u.lastName}` : "Unknown";
      })(),
      profilePic: (() => {
        const u = users.find((u) => u._id.toString() === rec._id);
        return u ? u.profilePic : "";
      })(),
      profile_picture_id: (() => {
        const u = users.find((u) => u._id.toString() === rec._id);
        return u ? u.profile_picture_id : "";
      })(),
      meals: Object.entries(rec.meals).map(([name, qty]) => ({
        name,
        qty,
      })),
      totalMeals: rec.totalMeals,
      feedback: rec.feedback,
    };
  });

  // Build users overview
  const usersOverview = users.map((u) => {
    const rec = ordersByUserMap[u._id.toString()] || { totalMeals: 0 };
    return {
      _id: u._id.toString(),
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      profilePic: u.profilePic || "",
      profile_picture_id: u.profile_picture_id || "",
      ordersCount: rec.totalMeals, // or count of orders if you want that
      totalSpent: orders
        .filter((o) => o.userId.toString() === u._id.toString())
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0),
    };
  });

  res.status(StatusCodes.OK).json({
    users: usersOverview,
    ordersByUser,
  });
};

/**
 * Caterer: analytics grouped by date -> meals -> users who ordered
 */
exports.getCatererAnalytics = async (req, res) => {
  // Fetch all orders with user info
  const orders = await FoodOrders.find()
    .populate("userId", "firstName lastName profile_picture_id")
    .lean();

  // Group by date (ISO date string)
  const dateMap = {}; // dateKey => array of meal records

  orders.forEach((order) => {
    const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = {};
    }
    const mealName = order.mealName || "Unknown";

    if (!dateMap[dateKey][mealName]) {
      dateMap[dateKey][mealName] = {
        totalOrders: 0,
        users: new Set(),
      };
    }
    const rec = dateMap[dateKey][mealName];
    rec.totalOrders += order.quantity;
    rec.users.add(
      order.userId
        ? `${order.userId.firstName} ${order.userId.lastName}`
        : "Unknown"
    );
  });

  // Convert sets to arrays
  const result = {};
  for (const [date, mealObj] of Object.entries(dateMap)) {
    result[date] = Object.entries(mealObj).map(([mealName, rec]) => ({
      mealName,
      totalOrders: rec.totalOrders,
      users: Array.from(rec.users),
    }));
  }

  res.status(StatusCodes.OK).json(result);
};
