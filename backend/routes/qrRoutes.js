const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const { protect } = require('../middleware/authMiddleware');

// Protected routes (for restaurant owners)
router.get('/', protect, qrController.getQRCodes);
router.post('/', protect, qrController.createQRCode);
router.post('/bulk', protect, qrController.bulkCreateQRCodes);
router.put('/:id', protect, qrController.updateQRCode);
router.delete('/:id', protect, qrController.deleteQRCode);

// Public route (for customers scanning the QR)
router.post('/:id/scan', qrController.trackScan);
router.post('/order/increment', qrController.incrementOrderCount);
router.put('/:id/reserve', protect, qrController.toggleReserveStatus);

module.exports = router;
