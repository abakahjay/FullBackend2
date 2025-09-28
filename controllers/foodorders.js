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

    const qty = quantity || 1;

    // ✅ Convert priceCents to cedis
    const pricePerMeal = meal.priceCents / 100;
    const totalPrice = pricePerMeal * qty;

    // ✅ Determine role automatically from user
    const orderedByRole = user.role || "worker";

    const order = new FoodOrders({
        userId,
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

    console.log("\x1b[36m%s\x1b[0m", `${user.name} orders retrieved`);

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
        .populate("userId", "firstName lastName email");

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
