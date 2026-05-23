const express = require('express');
const router = express.Router();
const { protectSuperAdmin } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/superAdminController');

// Public route
router.post('/login', login);

// Protected routes
router.get('/me', protectSuperAdmin, getMe);
router.get('/stats', protectSuperAdmin, getStats);

// Restaurant management
router.get('/restaurants', protectSuperAdmin, getRestaurants);
router.post('/restaurants', protectSuperAdmin, createRestaurant);
router.put('/restaurants/:id', protectSuperAdmin, updateRestaurant);
router.delete('/restaurants/:id', protectSuperAdmin, deleteRestaurant);
router.put('/restaurants/:id/status', protectSuperAdmin, changeStatus);
router.put('/restaurants/:id/extend', protectSuperAdmin, extendSubscription);

// Subscription plans CRUD
router.get('/plans', protectSuperAdmin, getPlans);
router.post('/plans', protectSuperAdmin, createPlan);
router.put('/plans/:id', protectSuperAdmin, updatePlan);
router.delete('/plans/:id', protectSuperAdmin, deletePlan);

// Payment tracking
router.get('/payments', protectSuperAdmin, getPayments);
router.post('/payments', protectSuperAdmin, logPayment);

// Ticket management
router.get('/tickets', protectSuperAdmin, getTickets);
router.put('/tickets/:id', protectSuperAdmin, updateTicketStatus);
router.post('/tickets/:id/reply', protectSuperAdmin, replyTicket);

// Global notifications
router.get('/notifications', protectSuperAdmin, getNotifications);
router.post('/notifications', protectSuperAdmin, createNotification);

// System Settings
router.get('/settings', protectSuperAdmin, getSettings);
router.post('/settings', protectSuperAdmin, saveSettings);

module.exports = router;
