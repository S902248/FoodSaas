const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'pending'],
    default: 'active',
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    required: true,
  },
  pricePaid: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
