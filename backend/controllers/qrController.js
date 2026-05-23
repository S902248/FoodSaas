const QRCode = require('../models/QRCode');
const mongoose = require('mongoose');

// Get all QR codes for a restaurant
exports.getQRCodes = async (req, res) => {
  try {
    const qrcodes = await QRCode.find({ restaurant: req.restaurant.id }).sort({ createdAt: -1 });
    
    // Calculate statistics
    const totalQRCodes = qrcodes.length;
    const activeTables = qrcodes.filter(qr => qr.status === 'active').length;
    
    // Calculate today's scans
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    // In a real application, we might want a separate ScanHistory collection for accurate daily counts.
    // For simplicity, we just look if lastScanned was today (which is an undercount, but works for basic implementation).
    let dailyScans = 0;
    qrcodes.forEach(qr => {
      if (qr.lastScanned && qr.lastScanned >= startOfDay && qr.lastScanned <= endOfDay) {
        dailyScans += 1;
      }
    });

    const totalOrdersViaQR = qrcodes.reduce((sum, qr) => sum + qr.ordersPlaced, 0);

    res.json({
      qrcodes,
      stats: {
        totalQRCodes,
        activeTables,
        dailyScans,
        totalOrdersViaQR
      }
    });
  } catch (error) {
    console.error('Error fetching QR codes:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create a single QR code
exports.createQRCode = async (req, res) => {
  try {
    const { tableName, section, status } = req.body;
    
    // Check if table already exists for this restaurant
    const existing = await QRCode.findOne({ restaurant: req.restaurant.id, tableName });
    if (existing) {
      return res.status(400).json({ message: 'A table with this name already exists' });
    }

    // Generate frontend scan URL
    // We'll create the record first to get the ID, then update it with the URL
    const qrcode = new QRCode({
      restaurant: req.restaurant.id,
      tableName,
      section,
      status: status || 'active',
      url: 'temp'
    });
    
    await qrcode.save();
    
    // Frontend scan URL
    qrcode.url = `http://localhost:5173/scan/${qrcode._id}`;
    await qrcode.save();

    res.status(201).json(qrcode);
  } catch (error) {
    console.error('Error creating QR code:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Bulk create QR codes
exports.bulkCreateQRCodes = async (req, res) => {
  try {
    const { prefix, startNumber, count, section } = req.body;
    const qrcodes = [];
    
    for (let i = 0; i < count; i++) {
      const tableName = `${prefix} ${startNumber + i}`;
      
      const existing = await QRCode.findOne({ restaurant: req.restaurant.id, tableName });
      if (!existing) {
        const qrcode = new QRCode({
          restaurant: req.restaurant.id,
          tableName,
          section,
          url: 'temp'
        });
        
        await qrcode.save();
        qrcode.url = `http://localhost:5173/scan/${qrcode._id}`;
        await qrcode.save();
        qrcodes.push(qrcode);
      }
    }
    
    res.status(201).json({ message: `${qrcodes.length} QR codes generated successfully`, qrcodes });
  } catch (error) {
    console.error('Error in bulk creation:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update QR code
exports.updateQRCode = async (req, res) => {
  try {
    const { tableName, section, status } = req.body;
    const qrcode = await QRCode.findOneAndUpdate(
      { _id: req.params.id, restaurant: req.restaurant.id },
      { tableName, section, status },
      { new: true }
    );
    
    if (!qrcode) {
      return res.status(404).json({ message: 'QR Code not found' });
    }
    
    res.json(qrcode);
  } catch (error) {
    console.error('Error updating QR code:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete QR code
exports.deleteQRCode = async (req, res) => {
  try {
    const qrcode = await QRCode.findOneAndDelete({ _id: req.params.id, restaurant: req.restaurant.id });
    if (!qrcode) {
      return res.status(404).json({ message: 'QR Code not found' });
    }
    res.json({ message: 'QR Code deleted successfully' });
  } catch (error) {
    console.error('Error deleting QR code:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Public route: Track scan
exports.trackScan = async (req, res) => {
  try {
    const qrcode = await QRCode.findById(req.params.id).populate('restaurant', 'name status');
    if (!qrcode) {
      return res.status(404).json({ message: 'QR Code not found' });
    }
    
    if (!qrcode.restaurant || qrcode.restaurant.status !== 'active') {
      return res.status(403).json({ message: 'Ordering is currently unavailable at this restaurant due to an inactive subscription.' });
    }

    if (qrcode.status !== 'active') {
      return res.status(400).json({ message: 'This table is currently inactive' });
    }

    // Increment scan count and update lastScanned
    qrcode.totalScans += 1;
    qrcode.lastScanned = new Date();
    await qrcode.save();

    res.json({ 
      restaurantId: qrcode.restaurant._id, 
      restaurantName: qrcode.restaurant.name,
      tableName: qrcode.tableName 
    });
  } catch (error) {
    console.error('Error tracking scan:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Public route: Increment order count for a table
exports.incrementOrderCount = async (req, res) => {
  try {
    const { restaurantId, tableName } = req.body;
    
    if (!restaurantId || !tableName) {
      return res.status(400).json({ message: 'restaurantId and tableName are required' });
    }

    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || restaurant.status !== 'active') {
      return res.status(403).json({ message: 'Ordering is currently unavailable at this restaurant due to an inactive subscription.' });
    }

    // Try to find the active QR code/table
    const qrcode = await QRCode.findOne({ 
      restaurant: restaurantId,
      tableName: { $regex: new RegExp(`^${tableName}$`, 'i') },
      status: 'active'
    });

    if (!qrcode) {
      return res.status(404).json({ message: 'Active table QR Code not found' });
    }

    qrcode.ordersPlaced += 1;
    await qrcode.save();

    res.json({ success: true, ordersPlaced: qrcode.ordersPlaced });
  } catch (error) {
    console.error('Error incrementing order count:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
