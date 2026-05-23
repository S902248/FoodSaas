const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');

const protect = async (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
  }

  // Check if not token
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_12345';
    // Verify token
    const decoded = jwt.verify(token, jwtSecret);

    // Fetch restaurant to check its status
    const restaurantObj = await Restaurant.findById(decoded.restaurant.id);
    if (!restaurantObj) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Check if subscription status is not active and request is a mutation
    if (restaurantObj.status !== 'active' && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
      return res.status(403).json({
        message: `Your restaurant subscription is currently ${restaurantObj.status}. Update operations are disabled. Please contact the administrator.`,
        status: restaurantObj.status
      });
    }

    // Add restaurant to payload
    req.restaurant = {
      ...decoded.restaurant,
      status: restaurantObj.status
    };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const protectSuperAdmin = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
  }

  // Check if not token
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_12345';
    // Verify token
    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded.superAdmin) {
      return res.status(403).json({ message: 'Not authorized, admin role required' });
    }

    // Add superAdmin to payload
    req.superAdmin = decoded.superAdmin;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = { protect, protectSuperAdmin };
