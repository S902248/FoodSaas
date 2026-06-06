const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  tableName: {
    type: String,
    required: true
  },
  section: {
    type: String,
    default: 'Main'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  isReserved: {
    type: Boolean,
    default: false
  },
  url: {
    type: String,
    required: true
  },
  totalScans: {
    type: Number,
    default: 0
  },
  ordersPlaced: {
    type: Number,
    default: 0
  },
  lastScanned: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('QRCode', qrCodeSchema);
