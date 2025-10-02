const express = require("express");
const router = express.Router();
const {
    createOrder,
    getUserOrders,
    getAllOrders,
    getTotalSpent,
    deleteOrder,
    updateOrderStatus,
    getAdminData,     // ✅ New controller
    getCatererData,
    getAdminAnalytics,
    getCatererAnalytics,   // ✅ New controller
} = require("../controllers/foodorders");

// Create new order (Worker/Admin)
router.post("/", createOrder);

// Get own orders (Worker/Admin)
router.get("/user/:userId", getUserOrders);

// Get all orders (Caterer/Admin)
router.get("/all", getAllOrders);

// Get total money spent (Admin)
router.get("/total", getTotalSpent);

// ✅ Admin-only: analytics (users, orders grouped daily, cumulative sum)
// router.get("/admin-data", getAdminData);
router.get("/admin-data", getAdminAnalytics);

// ✅ Caterer-only: grouped orders by meal
// router.get("/caterer-data", getCatererData);
router.get("/caterer-data", getCatererAnalytics);

// Update order status (Caterer/Admin)
router.patch("/:orderId/status", updateOrderStatus);

// Delete order (Admin or Worker for own order)
router.delete("/:orderId", deleteOrder);

module.exports = router;
