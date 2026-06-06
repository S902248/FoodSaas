const Restaurant = require('../models/Restaurant');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Create reusable nodemailer transporter using env vars
const createMailTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// @desc    Send OTP to registered email for password reset
// @route   POST /api/auth/forgot-password/send-email-otp
// @access  Public
const sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const restaurant = await Restaurant.findOne({ email: email.toLowerCase().trim() });
    if (!restaurant) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP & expiry (10 minutes)
    restaurant.resetOtp = otp;
    restaurant.resetOtpExpires = Date.now() + 10 * 60 * 1000;
    await restaurant.save();

    // Try to send email via nodemailer
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS &&
        !process.env.EMAIL_USER.includes('your_') && !process.env.EMAIL_PASS.includes('your_')) {
      try {
        const transporter = createMailTransporter();
        await transporter.sendMail({
          from: `"FoodaaS" <${process.env.EMAIL_USER}>`,
          to: restaurant.email,
          subject: 'FoodaaS - Password Reset OTP',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border-radius:12px;border:1px solid #e5e7eb">
              <h2 style="color:#6C4DFF;margin-bottom:8px">FoodaaS Password Reset</h2>
              <p style="color:#374151">Hi <strong>${restaurant.restaurantName}</strong>,</p>
              <p style="color:#374151">Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
              <div style="text-align:center;margin:24px 0">
                <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#6C4DFF">${otp}</span>
              </div>
              <p style="color:#6b7280;font-size:13px">If you didn't request this, ignore this email.</p>
              <p style="color:#6b7280;font-size:13px">— The FoodaaS Team</p>
            </div>
          `,
        });
        console.log(`[EMAIL OTP] Sent to ${restaurant.email}`);
        return res.json({ success: true, message: `OTP sent to ${restaurant.email}` });
      } catch (mailErr) {
        console.error('Email send error:', mailErr.message);
        // Fall through to simulated mode
      }
    }

    // Simulated / dev mode — return OTP in response
    console.log(`[SIMULATED EMAIL OTP] Restaurant: ${restaurant.restaurantName}, OTP: ${otp}`);
    return res.json({
      success: true,
      message: 'OTP generated (email not configured – dev mode).',
      otp,          // visible in dev mode only
      isSimulated: true,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Verify email OTP
// @route   POST /api/auth/forgot-password/verify-email-otp
// @access  Public
const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const restaurant = await Restaurant.findOne({
      email: email.toLowerCase().trim(),
      resetOtp: otp,
      resetOtpExpires: { $gt: Date.now() },
    });

    if (!restaurant) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Reset password using email OTP
// @route   POST /api/auth/forgot-password/reset-password-email
// @access  Public
const resetPasswordByEmail = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const restaurant = await Restaurant.findOne({
      email: email.toLowerCase().trim(),
      resetOtp: otp,
      resetOtpExpires: { $gt: Date.now() },
    });

    if (!restaurant) {
      return res.status(400).json({ message: 'Verification session expired. Please request a new OTP.' });
    }

    const salt = await bcrypt.genSalt(10);
    restaurant.password = await bcrypt.hash(newPassword, salt);
    restaurant.resetOtp = null;
    restaurant.resetOtpExpires = null;
    await restaurant.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Register a new restaurant
// @route   POST /api/auth/register
// @access  Public
const registerRestaurant = async (req, res) => {
  try {
    const { restaurantName, email, password, phone } = req.body;

    // Check if restaurant already exists
    let restaurant = await Restaurant.findOne({ email });
    if (restaurant) {
      return res.status(400).json({ message: 'Restaurant already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create restaurant
    restaurant = new Restaurant({
      restaurantName,
      email,
      password: hashedPassword,
      phone: phone || '',
    });

    await restaurant.save();

    // -- REAL-TIME NOTIFICATION HOOK --
    const { publishNotification } = require('../utils/redisClient');
    const notifMsg = `New restaurant registered: ${restaurantName} (${email})`;

    // 1. Save to DB (non-blocking — failure does NOT prevent real-time event)
    try {
      const Notification = require('../models/Notification');
      const newNotif = new Notification({
        title: 'New Registration',
        message: notifMsg,
        type: 'system',
        recipient: restaurant._id
      });
      await newNotif.save();
    } catch (dbErr) {
      console.error('[Notification] DB save failed (real-time still fires):', dbErr.message);
    }

    // 2. Always fire real-time event regardless of DB result
    try {
      await publishNotification({
        title: 'New Registration',
        message: notifMsg,
        time: new Date(),
        type: 'system'
      });
      console.log('[Notification] Real-time event published for:', restaurantName);
    } catch (pubErr) {
      console.error('[Notification] Failed to publish real-time event:', pubErr.message);
    }
    // ---------------------------------

    // Return JWT
    const payload = {
      restaurant: {
        id: restaurant.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '30d' }, // Longer expiration for convenience
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ token, restaurant: { id: restaurant.id, restaurantName: restaurant.restaurantName, email: restaurant.email, phone: restaurant.phone } });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Authenticate restaurant & get token
// @route   POST /api/auth/login
// @access  Public
const loginRestaurant = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if restaurant exists
    let restaurant = await Restaurant.findOne({ email });
    if (!restaurant) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    // Match password
    const isMatch = await bcrypt.compare(password, restaurant.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    // Generate JWT
    const payload = {
      restaurant: {
        id: restaurant.id,
      },
    };

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_12345';

    jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: '5 days' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, restaurantId: restaurant.id, restaurantName: restaurant.restaurantName });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get logged in restaurant details
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurant.id).select('-password');
    res.json(restaurant);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Helper to send SMS via Fast2SMS (free credits on signup) or Twilio
const sendSms = async (to, otpCode) => {
  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  // Clean the recipient number (Fast2SMS expects a 10-digit number without +91 or spaces for Indian numbers)
  const cleanNumber = to.replace(/[^0-9]/g, '').slice(-10);

  // 1. Try Fast2SMS (Free OTP route)
  if (fast2smsKey && !fast2smsKey.includes('your_fast2sms')) {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2smsKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          variables_values: otpCode,
          route: 'otp',
          numbers: cleanNumber
        })
      });
      const data = await response.json();
      if (data && data.return === true) {
        return { sent: true, provider: 'Fast2SMS' };
      } else {
        return { sent: false, error: data?.message || 'Fast2SMS returned failure status' };
      }
    } catch (err) {
      console.error('Fast2SMS SMS send error:', err.message);
      return { sent: false, error: err.message };
    }
  }

  // 2. Try Twilio
  if (
    twilioSid &&
    twilioToken &&
    twilioPhone &&
    !twilioSid.includes('your_twilio') &&
    !twilioToken.includes('your_twilio') &&
    !twilioPhone.includes('your_twilio')
  ) {
    try {
      const twilio = require('twilio');
      const client = twilio(twilioSid, twilioToken);
      await client.messages.create({
        body: `Your Foodaas password reset OTP is: ${otpCode}. Valid for 10 minutes.`,
        from: twilioPhone,
        to: to
      });
      return { sent: true, provider: 'Twilio' };
    } catch (err) {
      console.error('Twilio SMS send error:', err.message);
      return { sent: false, error: err.message };
    }
  }

  return { sent: false, provider: 'Simulated' };
};

// @desc    Send OTP to phone for password reset
// @route   POST /api/auth/forgot-password/send-otp
// @access  Public
const sendResetOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Find restaurant by phone
    const restaurant = await Restaurant.findOne({ phone });
    if (!restaurant) {
      return res.status(404).json({ message: 'No restaurant found with this phone number' });
    }

    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP and expiration (10 minutes)
    restaurant.resetOtp = otp;
    restaurant.resetOtpExpires = Date.now() + 10 * 60 * 1000;
    await restaurant.save();

    // Send via SMS gateway
    const smsResult = await sendSms(phone, otp);

    if (smsResult.sent) {
      console.log(`[REAL SMS] OTP sent to ${phone} via ${smsResult.provider}`);
      res.json({
        success: true,
        message: `OTP has been sent to your registered phone number via ${smsResult.provider}.`,
        otp: otp // Retained for developer convenience
      });
    } else {
      console.log(`[SIMULATED SMS] OTP for password reset of ${restaurant.restaurantName} is: ${otp}`);
      res.json({
        success: true,
        message: 'OTP sent successfully (Simulated).',
        otp: otp,
        isSimulated: true
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Verify OTP for password reset
// @route   POST /api/auth/forgot-password/verify-otp
// @access  Public
const verifyResetOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    const restaurant = await Restaurant.findOne({
      phone,
      resetOtp: otp,
      resetOtpExpires: { $gt: Date.now() }
    });

    if (!restaurant) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Reset password using OTP
// @route   POST /api/auth/forgot-password/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;
    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ message: 'Phone, OTP, and new password are required' });
    }

    // Verify OTP again for security
    const restaurant = await Restaurant.findOne({
      phone,
      resetOtp: otp,
      resetOtpExpires: { $gt: Date.now() }
    });

    if (!restaurant) {
      return res.status(400).json({ message: 'Verification session expired. Please request a new OTP.' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    restaurant.password = await bcrypt.hash(newPassword, salt);

    // Clear OTP fields
    restaurant.resetOtp = null;
    restaurant.resetOtpExpires = null;
    await restaurant.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Check if phone number is registered
// @route   POST /api/auth/forgot-password/check-phone
// @access  Public
const checkPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const cleanInputPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanInputPhone.length < 10) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit phone number' });
    }

    const restaurants = await Restaurant.find({});
    const restaurant = restaurants.find(r => {
      if (!r.phone) return false;
      const dbClean = r.phone.replace(/\D/g, '').slice(-10);
      return dbClean === cleanInputPhone;
    });

    if (!restaurant) {
      return res.status(404).json({ message: 'No restaurant found with this phone number' });
    }

    res.json({
      success: true,
      message: 'Phone number is registered'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Verify Firebase ID Token and Reset Password
// @route   POST /api/auth/forgot-password/firebase-reset
// @access  Public
const resetPasswordFirebase = async (req, res) => {
  try {
    const { idToken, newPassword } = req.body;
    if (!idToken || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // 1. Fetch Google public certs
    const certsResponse = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    if (!certsResponse.ok) {
      return res.status(500).json({ message: 'Failed to retrieve Google public certificates' });
    }
    const publicKeys = await certsResponse.json();

    // 2. Decode header to get kid
    const decodedToken = jwt.decode(idToken, { complete: true });
    if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
      return res.status(400).json({ message: 'Invalid token structure' });
    }

    const kid = decodedToken.header.kid;
    const publicKey = publicKeys[kid];
    if (!publicKey) {
      return res.status(400).json({ message: 'Invalid token key ID' });
    }

    // 3. Verify token signature & claims
    let decoded;
    try {
      decoded = jwt.verify(idToken, publicKey, {
        audience: 'foodsaas-ab999',
        issuer: 'https://securetoken.google.com/foodsaas-ab999',
        algorithms: ['RS256']
      });
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return res.status(400).json({ message: 'Verification failed: ' + err.message });
    }

    // 4. Retrieve phone number
    const firebasePhone = decoded.phone_number;
    if (!firebasePhone) {
      return res.status(400).json({ message: 'No phone number associated with this token' });
    }

    const cleanFirebasePhone = firebasePhone.replace(/\D/g, '').slice(-10);

    // 5. Find restaurant and update
    const restaurants = await Restaurant.find({});
    const restaurant = restaurants.find(r => {
      if (!r.phone) return false;
      const dbClean = r.phone.replace(/\D/g, '').slice(-10);
      return dbClean === cleanFirebasePhone;
    });

    if (!restaurant) {
      return res.status(404).json({ message: 'No restaurant found with this phone number' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    restaurant.password = await bcrypt.hash(newPassword, salt);
    
    // Clear legacy OTP fields
    restaurant.resetOtp = null;
    restaurant.resetOtpExpires = null;
    await restaurant.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

module.exports = {
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
};
