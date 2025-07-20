const express = require('express');
const router = express.Router();
const {
  getAllOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus
} = require('../controllers/MTNOrders');

router.route('/').get(getAllOrders).post(createOrder);
router.route('/:id').get(getOrder).patch(updateOrder).delete(deleteOrder);
router.patch('/:id/status', updateOrderStatus); // ✅ New route just for status

module.exports = router;
