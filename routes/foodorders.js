const express = require("express");
const router = express.Router();
const {
    createOrder,
    getUserOrders,
    getAllOrders,
    getTotalSpent,
    deleteOrder,
    updateOrderStatus, // ✅ Import new controller function
} = require("../controllers/foodorders");

// Create new order (Worker/Admin)
router.post("/", createOrder);

// Get own orders (Worker/Admin)
router.get("/user/:userId", getUserOrders);

// Get all orders (Caterer/Admin)
router.get("/all", getAllOrders);

// Get total money spent (Admin)
router.get("/total", getTotalSpent);

// Update order status (Caterer/Admin)
router.patch("/:orderId/status", updateOrderStatus); // ✅ New route

// Delete order (Admin or Worker for own order)
router.delete("/:orderId", deleteOrder);

module.exports = router;
