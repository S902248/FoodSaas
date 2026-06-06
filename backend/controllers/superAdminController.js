const SuperAdmin = require('../models/SuperAdmin');
const Restaurant = require('../models/Restaurant');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const Branch = require('../models/Branch');
const Payment = require('../models/Payment');
const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const Order = require('../models/Order');
const QRCode = require('../models/QRCode');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper to log administrative actions
const logAction = async (action, details, performedBy = 'Super Admin') => {
  try {
    const log = new AuditLog({ action, details, performedBy });
    await log.save();
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};

// @desc    Super Admin Login
// @route   POST /api/superadmin/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Normalize email to lowercase to match schema
    const normalizedEmail = (email || '').toLowerCase().trim();
    const admin = await SuperAdmin.findOne({ email: normalizedEmail });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const payload = {
      superAdmin: {
        id: admin.id,
      },
    };

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_12345';
    jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: '5 days' },
      async (err, token) => {
        if (err) throw err;
        await logAction('Login', `Super Admin ${admin.email} logged in successfully`);
        res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get Current Super Admin
// @route   GET /api/superadmin/me
// @access  Private (Super Admin)
const getMe = async (req, res) => {
  try {
    const admin = await SuperAdmin.findById(req.superAdmin.id).select('-password');
    res.json(admin);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get Dashboard Aggregate Stats & Trends
// @route   GET /api/superadmin/stats
// @access  Private (Super Admin)
const getStats = async (req, res) => {
  try {
    const now = new Date();

    const [
      totalRest,
      activeRest,
      allRestaurants,
      totalOrd,
      allBranches,
      allQRs,
      allPayments,
      allLogs
    ] = await Promise.all([
      Restaurant.find(),
      Restaurant.find({ status: 'active' }),
      Restaurant.find().populate('plan'),
      Order.find(),
      Branch.find(),
      QRCode.find(),
      Payment.find().populate('restaurant'),
      AuditLog.find().sort({ createdAt: -1 })
    ]);

    // Expired restaurants count
    const expiredCount = allRestaurants.filter(r => 
      r.status === 'expired' || (r.subscriptionExpiry && new Date(r.subscriptionExpiry) < now)
    ).length;

    // Suspended restaurants count
    const suspendedCount = allRestaurants.filter(r => r.status === 'suspended').length;

    // Monthly revenue computation (payments completed in the current month)
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthlyRev = allPayments
      .filter(p => p.status === 'Completed' && new Date(p.date).getMonth() === currentMonth && new Date(p.date).getFullYear() === currentYear)
      .reduce((sum, p) => sum + p.amount, 0);

    // Active branches
    const activeBranches = allBranches.filter(b => b.status === 'active').length;

    // Total Tables
    const totalTables = allQRs.length;

    // Pending renewals (active but expiring in the next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    const pendingRenewals = allRestaurants.filter(r => 
      r.status === 'active' && 
      r.subscriptionExpiry && 
      new Date(r.subscriptionExpiry) > now && 
      new Date(r.subscriptionExpiry) <= nextWeek
    ).length;

    // Recent Payments
    const recentPayments = allPayments
      .slice(-5)
      .reverse()
      .map(p => ({
        id: p._id,
        restaurantName: p.restaurant ? p.restaurant.restaurantName : 'Unknown Restaurant',
        amount: p.amount,
        date: p.date,
        status: p.status,
        method: p.method
      }));

    // Recent Restaurants
    const recentRestaurants = allRestaurants
      .slice(-5)
      .reverse()
      .map(r => ({
        id: r._id,
        restaurantName: r.restaurantName,
        ownerName: r.ownerName,
        email: r.email,
        createdAt: r.createdAt,
        status: r.status,
        planName: r.plan ? r.plan.name : 'No Plan'
      }));

    // Recent System Activity Timeline
    const timeline = allLogs.slice(0, 10).map(l => ({
      id: l._id,
      action: l.action,
      details: l.details,
      performedBy: l.performedBy,
      time: l.createdAt
    }));

    // Graph Data: Monthly Revenue past 6 months
    const monthlyRevenueGraph = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const label = `${months[mIdx]} ${yr}`;
      
      const rev = allPayments
        .filter(p => p.status === 'Completed' && new Date(p.date).getMonth() === mIdx && new Date(p.date).getFullYear() === yr)
        .reduce((sum, p) => sum + p.amount, 0);

      monthlyRevenueGraph.push({ name: label, Revenue: rev });
    }

    // Graph Data: Subscription Growth past 6 months
    const subscriptionGrowthGraph = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const label = `${months[mIdx]} ${yr}`;
      
      const count = allRestaurants.filter(r => {
        const cDate = new Date(r.createdAt);
        return cDate.getMonth() <= mIdx && cDate.getFullYear() <= yr;
      }).length;

      subscriptionGrowthGraph.push({ name: label, Active: count, Expired: Math.round(count * 0.1) });
    }

    res.json({
      metrics: {
        totalRestaurants: totalRest.length,
        activeRestaurants: activeRest.length,
        suspendedRestaurants: suspendedCount,
        expiredSubscriptions: expiredCount,
        monthlyRevenue: monthlyRev,
        totalOrders: totalOrd.length,
        activeBranches,
        totalTables,
        pendingRenewals
      },
      recentPayments,
      recentRestaurants,
      timeline,
      charts: {
        monthlyRevenue: monthlyRevenueGraph,
        subscriptionGrowth: subscriptionGrowthGraph
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get All Restaurants
// @route   GET /api/superadmin/restaurants
// @access  Private (Super Admin)
const getRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate('plan');
    const branches = await Branch.find();
    
    const mapped = restaurants.map(r => {
      const restBranches = branches.filter(b => b.restaurant.toString() === r._id.toString());
      return {
        id: r._id,
        restaurantName: r.restaurantName,
        ownerName: r.ownerName,
        email: r.email,
        phone: r.phone,
        plan: r.plan ? r.plan.name : 'Free',
        planId: r.plan ? r.plan._id : null,
        branchesCount: restBranches.length,
        status: r.status,
        subscriptionExpiry: r.subscriptionExpiry,
        createdAt: r.createdAt
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Create new Restaurant
// @route   POST /api/superadmin/restaurants
// @access  Private (Super Admin)
const createRestaurant = async (req, res) => {
  try {
    const { restaurantName, email, password, ownerName, phone, planId, expiryDays, tableLimit } = req.body;

    let existing = await Restaurant.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (parseInt(expiryDays) || 30));

    const restaurant = new Restaurant({
      restaurantName,
      email,
      password: hashedPassword,
      ownerName,
      phone,
      tableLimit: tableLimit ? parseInt(tableLimit) : 50,
      plan: planId || null,
      status: 'active',
      subscriptionExpiry: expiry
    });

    await restaurant.save();
    await logAction('Create Restaurant', `Created restaurant ${restaurantName} (Owner: ${ownerName})`);

    // Fire real-time notification to superadmin dashboard
    try {
      const { publishNotification } = require('../utils/redisClient');
      const notifMsg = `New restaurant created: ${restaurantName} (${email})`;
      await publishNotification({
        title: 'New Restaurant Added',
        message: notifMsg,
        time: new Date(),
        type: 'system'
      });
      console.log('[Notification] Published for new restaurant:', restaurantName);
    } catch (pubErr) {
      console.error('[Notification] Failed to publish:', pubErr.message);
    }

    res.status(201).json(restaurant);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Update Restaurant
// @route   PUT /api/superadmin/restaurants/:id
// @access  Private (Super Admin)
const updateRestaurant = async (req, res) => {
  try {
    const { restaurantName, ownerName, email, phone, planId, status, subscriptionExpiry } = req.body;
    
    const updateObj = {
      restaurantName,
      ownerName,
      email,
      phone,
      status,
      subscriptionExpiry: subscriptionExpiry ? new Date(subscriptionExpiry) : undefined
    };

    if (planId) {
      updateObj.plan = planId;
    }

    const updated = await Restaurant.findByIdAndUpdate(req.params.id, { $set: updateObj }, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    await logAction('Update Restaurant', `Updated restaurant details for ${restaurantName}`);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Delete Restaurant
// @route   DELETE /api/superadmin/restaurants/:id
// @access  Private (Super Admin)
const deleteRestaurant = async (req, res) => {
  try {
    const rest = await Restaurant.findById(req.params.id);
    if (!rest) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const restId = req.params.id;
    await Restaurant.findByIdAndDelete(restId);

    // Cleanup ALL associated branches, QRs, and orders (deleteMany, not findOneAndDelete)
    await Promise.all([
      Branch.deleteMany({ restaurant: restId }),
      QRCode.deleteMany({ restaurant: restId }),
      Order.deleteMany({ restaurant: restId })
    ]);

    await logAction('Delete Restaurant', `Deleted restaurant ${rest.restaurantName} and all associated records`);
    res.json({ message: 'Restaurant deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Update Restaurant Status (Suspend/Activate)
// @route   PUT /api/superadmin/restaurants/:id/status
// @access  Private (Super Admin)
const changeStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'active', 'suspended', 'expired'
    const rest = await Restaurant.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    if (!rest) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    await logAction('Change Status', `Set status of restaurant ${rest.restaurantName} to ${status}`);
    res.json(rest);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Extend Subscription
// @route   PUT /api/superadmin/restaurants/:id/extend
// @access  Private (Super Admin)
const extendSubscription = async (req, res) => {
  try {
    const { days } = req.body;
    const rest = await Restaurant.findById(req.params.id);
    if (!rest) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    let currentExpiry = rest.subscriptionExpiry ? new Date(rest.subscriptionExpiry) : new Date();
    // If expired, base expiry from today
    if (currentExpiry < new Date()) {
      currentExpiry = new Date();
    }
    
    currentExpiry.setDate(currentExpiry.getDate() + parseInt(days));
    
    rest.subscriptionExpiry = currentExpiry;
    rest.status = 'active'; // automatically reactivate if extended
    await rest.save();

    await logAction('Extend Subscription', `Extended subscription of ${rest.restaurantName} by ${days} days`);
    res.json(rest);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Get subscription Plans
// @route   GET /api/superadmin/plans
// @access  Private (Super Admin)
const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Create subscription Plan
// @route   POST /api/superadmin/plans
// @access  Private (Super Admin)
const createPlan = async (req, res) => {
  try {
    const { name, price, billingPeriod, features, maxTables, maxBranches, qrLimits, staffLimits } = req.body;

    const plan = new Plan({
      name,
      price,
      billingPeriod,
      features: Array.isArray(features) ? features : features.split(',').map(f => f.trim()),
      maxTables,
      maxBranches,
      qrLimits,
      staffLimits
    });

    await plan.save();
    await logAction('Create Plan', `Created pricing plan ${name}`);
    res.status(201).json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Update subscription Plan
// @route   PUT /api/superadmin/plans/:id
// @access  Private (Super Admin)
const updatePlan = async (req, res) => {
  try {
    const { name, price, billingPeriod, features, maxTables, maxBranches, qrLimits, staffLimits } = req.body;
    
    const fields = {
      name,
      price,
      billingPeriod,
      features: Array.isArray(features) ? features : features.split(',').map(f => f.trim()),
      maxTables,
      maxBranches,
      qrLimits,
      staffLimits
    };

    const updated = await Plan.findByIdAndUpdate(req.params.id, { $set: fields }, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    await logAction('Update Plan', `Updated pricing plan ${name}`);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Delete subscription Plan
// @route   DELETE /api/superadmin/plans/:id
// @access  Private (Super Admin)
const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    await Plan.findByIdAndDelete(req.params.id);
    await logAction('Delete Plan', `Deleted pricing plan ${plan.name}`);
    res.json({ message: 'Plan deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Get Payments
// @route   GET /api/superadmin/payments
// @access  Private (Super Admin)
const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find().populate('restaurant');
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Log Manual Payment
// @route   POST /api/superadmin/payments
// @access  Private (Super Admin)
const logPayment = async (req, res) => {
  try {
    const { restaurantId, amount, method, date } = req.body;

    const rest = await Restaurant.findById(restaurantId);
    if (!rest) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const pay = new Payment({
      restaurant: restaurantId,
      amount: parseFloat(amount),
      method,
      status: 'Completed',
      date: date ? new Date(date) : new Date()
    });

    await pay.save();
    
    // Automatically renew the subscription as a result of logging a payment
    let currentExpiry = rest.subscriptionExpiry ? new Date(rest.subscriptionExpiry) : new Date();
    if (currentExpiry < new Date()) {
      currentExpiry = new Date();
    }
    currentExpiry.setMonth(currentExpiry.getMonth() + 1); // extend 30 days
    rest.subscriptionExpiry = currentExpiry;
    rest.status = 'active';
    await rest.save();

    await logAction('Log Payment', `Recorded manual payment of ₹${amount} for ${rest.restaurantName} and extended subscription by 30 days`);
    
    res.status(201).json(pay);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Get Support Tickets
// @route   GET /api/superadmin/tickets
// @access  Private (Super Admin)
const getTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find().populate('restaurant');
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Update Ticket Status
// @route   PUT /api/superadmin/tickets/:id
// @access  Private (Super Admin)
const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true }).populate('restaurant');
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    await logAction('Update Support Ticket', `Set status of ticket #${ticket._id.toString().slice(-6)} to ${status}`);
    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Reply to Support Ticket
// @route   POST /api/superadmin/tickets/:id/reply
// @access  Private (Super Admin)
const replyTicket = async (req, res) => {
  try {
    const { text } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.messages.push({
      sender: 'SuperAdmin',
      text,
      createdAt: new Date()
    });
    
    // Automatically flag as In Progress if replied
    if (ticket.status === 'Open') {
      ticket.status = 'In Progress';
    }

    await ticket.save();
    await logAction('Ticket Reply', `Replied to ticket #${ticket._id.toString().slice(-6)}`);
    res.status(201).json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Get System Notifications
// @route   GET /api/superadmin/notifications
// @access  Private (Super Admin)
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().populate('recipient');
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Send Global Announcement
// @route   POST /api/superadmin/notifications
// @access  Private (Super Admin)
const createNotification = async (req, res) => {
  try {
    const { title, message, type, recipientId } = req.body;

    const notif = new Notification({
      title,
      message,
      type: type || 'global',
      recipient: recipientId || null
    });

    await notif.save();
    await logAction('Global Announcement', `Dispatched notification: "${title}"`);
    res.status(201).json(notif);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// Local storage mockup in db.json for System Settings
let systemSettings = {
  platformName: 'FoodaaS',
  logoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80',
  smtpHost: 'smtp.foodaas.com',
  smtpPort: '587',
  smtpUser: 'alerts@foodaas.com',
  currency: 'INR',
  currencySymbol: '₹',
  taxPercentage: '18',
  themeDefault: 'light'
};

// @desc    Get Platform Settings
// @route   GET /api/superadmin/settings
// @access  Private (Super Admin)
const getSettings = async (req, res) => {
  try {
    res.json(systemSettings);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Save Platform Settings
// @route   POST /api/superadmin/settings
// @access  Private (Super Admin)
const saveSettings = async (req, res) => {
  try {
    Object.assign(systemSettings, req.body);
    await logAction('Update Settings', 'Updated system configurations & branding parameters');
    res.json({ message: 'Settings saved successfully', settings: systemSettings });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  login,
  getMe,
  getStats,
  getRestaurants,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  changeStatus,
  extendSubscription,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getPayments,
  logPayment,
  getTickets,
  updateTicketStatus,
  replyTicket,
  getNotifications,
  createNotification,
  getSettings,
  saveSettings
};
