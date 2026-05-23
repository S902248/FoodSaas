const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  restaurantName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  ownerName: {
    type: String,
    default: 'Owner',
  },
  phone: {
    type: String,
    default: '',
  },
  resetOtp: {
    type: String,
    default: null,
  },
  resetOtpExpires: {
    type: Date,
    default: null,
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'expired'],
    default: 'active',
  },
  subscriptionExpiry: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
