const express = require('express');
const router = express.Router();
const { 
  registerRestaurant, 
  loginRestaurant, 
  getMe,
  sendResetOtp,
  verifyResetOtp,
  resetPassword,
  checkPhone,
  resetPasswordFirebase,
  sendEmailOtp,
  verifyEmailOtp,
  resetPasswordByEmail,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerRestaurant);
router.post('/login', loginRestaurant);
router.get('/me', protect, getMe);

router.post('/forgot-password/check-phone', checkPhone);
router.post('/forgot-password/firebase-reset', resetPasswordFirebase);
router.post('/forgot-password/send-otp', sendResetOtp);
router.post('/forgot-password/verify-otp', verifyResetOtp);
router.post('/forgot-password/reset-password', resetPassword);

// Email-based OTP routes (no Firebase / billing required)
router.post('/forgot-password/send-email-otp', sendEmailOtp);
router.post('/forgot-password/verify-email-otp', verifyEmailOtp);
router.post('/forgot-password/reset-password-email', resetPasswordByEmail);

// Public route to get restaurant subscription status
router.get('/restaurant/:id/status', async (req, res) => {
  try {
    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    res.json({ 
      restaurantName: restaurant.restaurantName, 
      status: restaurant.status 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
