const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
  },
  billingPeriod: {
    type: String,
    default: 'Monthly',
  },
  features: [
    { type: String }
  ],
  maxTables: {
    type: Number,
    required: true,
  },
  maxBranches: {
    type: Number,
    required: true,
  },
  qrLimits: {
    type: Number,
    required: true,
  },
  staffLimits: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
