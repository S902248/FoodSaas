const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
  performedBy: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
