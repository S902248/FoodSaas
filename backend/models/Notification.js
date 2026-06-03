const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['global', 'expiry', 'system', 'low_stock'],
    default: 'global',
  },
  productName: {
    type: String,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
