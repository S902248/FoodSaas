const mongoose = require('mongoose');

const superAdminSchema = new mongoose.Schema({
  name: {
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
  role: {
    type: String,
    default: 'SUPER_ADMIN',
  },
}, { timestamps: true });

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
