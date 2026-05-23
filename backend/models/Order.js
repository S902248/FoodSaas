const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  orderId: {
    type: String,
    required: true
  },
  tableName: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    default: 'Guest'
  },
  items: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true }
    }
  ],
  totalAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending'],
    default: 'Pending'
  },
  status: {
    type: String,
    enum: ['New Order', 'Accepted', 'Preparing', 'Ready', 'Served', 'Completed', 'Cancelled'],
    default: 'New Order'
  },
  eta: {
    type: String,
    default: '15 min'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
