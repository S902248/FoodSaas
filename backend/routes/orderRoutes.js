const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// Public route: customer checkout to place order
router.post('/', orderController.createOrder);

// Protected routes: owner views and manages orders
router.get('/', protect, orderController.getOrders);
router.put('/:id/status', protect, orderController.updateOrderStatus);
router.put('/table/:tableName/checkout', protect, orderController.checkoutTable);

module.exports = router;
