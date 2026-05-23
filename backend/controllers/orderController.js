const Order = require('../models/Order');
const QRCode = require('../models/QRCode');

// Create a new order (Public route called by CustomerMenu checkout)
exports.createOrder = async (req, res) => {
  try {
    const { restaurantId, tableName, items, totalAmount } = req.body;

    if (!restaurantId || !tableName || !items || !totalAmount) {
      return res.status(400).json({ message: 'Missing required order fields: restaurantId, tableName, items, totalAmount' });
    }

    const Restaurant = require('../models/Restaurant');
    const restaurantObj = await Restaurant.findById(restaurantId);
    if (!restaurantObj || restaurantObj.status !== 'active') {
      return res.status(403).json({ message: 'Ordering is currently unavailable at this restaurant due to an inactive subscription.' });
    }

    // Determine sequential order id for this restaurant
    let orderCount = 0;
    if (typeof Order.countDocuments === 'function') {
      orderCount = await Order.countDocuments({ restaurant: restaurantId });
    } else {
      const existingOrders = await Order.find({ restaurant: restaurantId });
      orderCount = existingOrders.length;
    }
    
    const orderId = `#${1001 + orderCount}`;

    // Create the order object
    const order = new Order({
      restaurant: restaurantId,
      orderId,
      tableName,
      customerName: `Guest ${Math.floor(100 + Math.random() * 900)}`,
      items,
      totalAmount,
      paymentStatus: 'Pending',
      status: 'New Order',
      eta: '15 min'
    });

    await order.save();

    // Increment orders count on the scanned table QR code
    try {
      const qrcode = await QRCode.findOne({
        restaurant: restaurantId,
        tableName: { $regex: new RegExp(`^${tableName}$`, 'i') },
        status: 'active'
      });

      if (qrcode) {
        qrcode.ordersPlaced += 1;
        await qrcode.save();
      }
    } catch (qrErr) {
      console.error('Failed to increment QR code orders count:', qrErr);
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get all orders for the current restaurant (Protected route)
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ restaurant: req.restaurant.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update order status (Protected route)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, eta, paymentStatus } = req.body;
    const updateFields = {};

    if (status !== undefined) updateFields.status = status;
    if (eta !== undefined) updateFields.eta = eta;
    if (paymentStatus !== undefined) updateFields.paymentStatus = paymentStatus;

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, restaurant: req.restaurant.id },
      { $set: updateFields },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
