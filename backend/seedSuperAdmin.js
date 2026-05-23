require('dotenv').config();

if (process.env.USE_MOCK_DB === 'true') {
  console.log('--- SEEDING WITH MOCK DATABASE (mockMongoose.js) ---');
  const mockMongoose = require('./mockMongoose');
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === 'mongoose') {
      return mockMongoose;
    }
    return originalRequire.apply(this, arguments);
  };
}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SuperAdmin = require('./models/SuperAdmin');
const Plan = require('./models/Plan');
const Restaurant = require('./models/Restaurant');
const Branch = require('./models/Branch');
const Payment = require('./models/Payment');
const SupportTicket = require('./models/SupportTicket');
const Notification = require('./models/Notification');
const AuditLog = require('./models/AuditLog');
const QRCode = require('./models/QRCode');
const Order = require('./models/Order');

async function seed() {
  try {
    // 1. Clear database collections (except Food if it exists)
    // For mock DB, we can just replace lists or do deleteMany
    await SuperAdmin.deleteMany({});
    await Plan.deleteMany({});
    await Restaurant.deleteMany({});
    await Branch.deleteMany({});
    await Payment.deleteMany({});
    await SupportTicket.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});
    await QRCode.deleteMany({});
    await Order.deleteMany({});

    console.log('Cleared existing collections...');

    // 2. Hash Passwords
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const ownerPassword = await bcrypt.hash('owner123', salt);

    // 3. Seed Super Admin
    const admin = new SuperAdmin({
      name: 'Global Administrator',
      email: 'admin@foodaas.com',
      password: adminPassword,
      role: 'SUPER_ADMIN'
    });
    await admin.save();
    console.log('Created Super Admin...');

    // 4. Seed Plans
    const basicPlan = new Plan({
      name: 'Basic Plan',
      price: 999,
      billingPeriod: 'Monthly',
      features: ['1 Branch Limit', 'Up to 5 Tables', 'Standard QR Codes', '2 Staff Members max', 'Basic Email Support'],
      maxTables: 5,
      maxBranches: 1,
      qrLimits: 5,
      staffLimits: 2
    });
    await basicPlan.save();

    const proPlan = new Plan({
      name: 'Pro Plan',
      price: 2499,
      billingPeriod: 'Monthly',
      features: ['5 Branches Limit', 'Up to 25 Tables', 'Custom Logo QR Codes', 'Live Orders Tracking', '10 Staff Members', 'Priority Email Support'],
      maxTables: 25,
      maxBranches: 5,
      qrLimits: 25,
      staffLimits: 10
    });
    await proPlan.save();

    const enterprisePlan = new Plan({
      name: 'Enterprise Plan',
      price: 5999,
      billingPeriod: 'Monthly',
      features: ['Unlimited Branches', 'Unlimited Tables', 'Premium Branding Custom QR', 'Real-Time Order Monitoring', 'Unlimited Staff Accounts', '24/7 Dedicated Call Support'],
      maxTables: 999,
      maxBranches: 999,
      qrLimits: 999,
      staffLimits: 999
    });
    await enterprisePlan.save();
    console.log('Created Subscription Plans...');

    // 5. Seed Restaurants
    const r1Expiry = new Date();
    r1Expiry.setDate(r1Expiry.getDate() + 30);

    const r2Expiry = new Date();
    r2Expiry.setDate(r2Expiry.getDate() + 15);

    const r3Expiry = new Date();
    r3Expiry.setDate(r3Expiry.getDate() - 3); // Expired 3 days ago

    const r4Expiry = new Date();
    r4Expiry.setDate(r4Expiry.getDate() - 10); // Expired 10 days ago

    const r5Expiry = new Date();
    r5Expiry.setDate(r5Expiry.getDate() + 5);

    const natkhat = new Restaurant({
      restaurantName: 'natkhat',
      email: 'natkhat@gmail.com',
      password: ownerPassword,
      ownerName: 'Shubham Kumar',
      phone: '+91 9876543210',
      plan: proPlan._id,
      status: 'active',
      subscriptionExpiry: r1Expiry,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // 60 days ago
    });
    await natkhat.save();

    const osteria = new Restaurant({
      restaurantName: 'Osteria Bella',
      email: 'osteria@gmail.com',
      password: ownerPassword,
      ownerName: 'Giovanni Rossi',
      phone: '+91 8765432109',
      plan: enterprisePlan._id,
      status: 'active',
      subscriptionExpiry: r2Expiry,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) // 45 days ago
    });
    await osteria.save();

    const spice = new Restaurant({
      restaurantName: 'Spice Route',
      email: 'spice@gmail.com',
      password: ownerPassword,
      ownerName: 'Karan Sharma',
      phone: '+91 7654321098',
      plan: basicPlan._id,
      status: 'suspended',
      subscriptionExpiry: r3Expiry,
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days ago
    });
    await spice.save();

    const sushi = new Restaurant({
      restaurantName: 'Sushi House',
      email: 'sushi@gmail.com',
      password: ownerPassword,
      ownerName: 'Yuki Tanaka',
      phone: '+91 6543210987',
      plan: proPlan._id,
      status: 'expired',
      subscriptionExpiry: r4Expiry,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
    });
    await sushi.save();

    const burger = new Restaurant({
      restaurantName: 'The Burger Club',
      email: 'burger@gmail.com',
      password: ownerPassword,
      ownerName: 'Sarah Jenkins',
      phone: '+91 5432109876',
      plan: proPlan._id,
      status: 'active',
      subscriptionExpiry: r5Expiry,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
    });
    await burger.save();

    console.log('Created Restaurant accounts...');

    // 6. Seed Branches
    const branches = [
      { restaurant: natkhat._id, branchName: 'natkhat - Sector 62', location: 'Noida', status: 'active', tablesCount: 12, staffCount: 4 },
      { restaurant: natkhat._id, branchName: 'natkhat - Indirapuram', location: 'Ghaziabad', status: 'active', tablesCount: 8, staffCount: 3 },
      { restaurant: osteria._id, branchName: 'Osteria - Connaught Place', location: 'New Delhi', status: 'active', tablesCount: 20, staffCount: 8 },
      { restaurant: osteria._id, branchName: 'Osteria - DLF Phase 3', location: 'Gurugram', status: 'active', tablesCount: 15, staffCount: 6 },
      { restaurant: spice._id, branchName: 'Spice Route - Mall Road', location: 'Shimla', status: 'inactive', tablesCount: 6, staffCount: 2 },
      { restaurant: sushi._id, branchName: 'Sushi House - MG Road', location: 'Bengaluru', status: 'active', tablesCount: 10, staffCount: 4 },
      { restaurant: burger._id, branchName: 'Burger Club - Saket', location: 'New Delhi', status: 'active', tablesCount: 8, staffCount: 3 }
    ];

    for (const b of branches) {
      const branch = new Branch(b);
      await branch.save();
    }
    console.log('Created branches...');

    // 7. Seed Payments (Transaction history for charts)
    // We create multiple payments across the past 3 months
    const makeDate = (daysAgo) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d;
    };

    const payments = [
      { restaurant: natkhat._id, amount: 2499, status: 'Completed', method: 'UPI', date: makeDate(45) },
      { restaurant: natkhat._id, amount: 2499, status: 'Completed', method: 'UPI', date: makeDate(15) },
      
      { restaurant: osteria._id, amount: 5999, status: 'Completed', method: 'Bank Transfer', date: makeDate(35) },
      { restaurant: osteria._id, amount: 5999, status: 'Completed', method: 'Card', date: makeDate(5) },
      
      { restaurant: spice._id, amount: 999, status: 'Completed', method: 'Cash', date: makeDate(85) },
      { restaurant: spice._id, amount: 999, status: 'Completed', method: 'UPI', date: makeDate(55) },
      { restaurant: spice._id, amount: 999, status: 'Failed', method: 'UPI', date: makeDate(25) },
      
      { restaurant: sushi._id, amount: 2499, status: 'Completed', method: 'Card', date: makeDate(40) },
      { restaurant: sushi._id, amount: 2499, status: 'Failed', method: 'UPI', date: makeDate(10) },
      
      { restaurant: burger._id, amount: 2499, status: 'Completed', method: 'UPI', date: makeDate(2) }
    ];

    for (const p of payments) {
      const payment = new Payment(p);
      await payment.save();
    }
    console.log('Created payments ledger...');

    // 8. Seed QR Codes & Orders (Connect to the mock dashboard order/QR trackers)
    const qr1 = new QRCode({
      restaurant: natkhat._id,
      tableName: 'Table 1',
      section: 'Main Area',
      status: 'active',
      url: `http://localhost:5173/scan/natkhat-t1`,
      totalScans: 42,
      ordersPlaced: 12
    });
    await qr1.save();

    const qr2 = new QRCode({
      restaurant: osteria._id,
      tableName: 'Table 4',
      section: 'Terrace',
      status: 'active',
      url: `http://localhost:5173/scan/osteria-t4`,
      totalScans: 85,
      ordersPlaced: 30
    });
    await qr2.save();

    const ord1 = new Order({
      restaurant: natkhat._id,
      orderId: '#1204',
      tableName: 'Table 1',
      customerName: 'Aman Saxena',
      items: [
        { name: 'Paneer Butter Masala', price: 250, quantity: 1 },
        { name: 'Garlic Naan', price: 50, quantity: 2 }
      ],
      totalAmount: 350,
      paymentStatus: 'Pending',
      status: 'Preparing',
      eta: '10 mins'
    });
    await ord1.save();

    const ord2 = new Order({
      restaurant: osteria._id,
      orderId: '#1205',
      tableName: 'Table 4',
      customerName: 'Aditi Roy',
      items: [
        { name: 'Chicken Biryani', price: 300, quantity: 2 },
        { name: 'Gulab Jamun', price: 80, quantity: 1 }
      ],
      totalAmount: 680,
      paymentStatus: 'Paid',
      status: 'New Order',
      eta: '15 mins'
    });
    await ord2.save();

    console.log('Created QR codes and orders...');

    // 9. Seed Support Tickets
    const t1 = new SupportTicket({
      restaurant: natkhat._id,
      title: 'UPI Payment issue on renewal',
      description: 'I sent the payment of ₹2499 through UPI but my plan validity did not update automatically. Please check and extend the expiry.',
      category: 'Billing',
      status: 'Open',
      priority: 'High',
      messages: [
        { sender: 'Restaurant', text: 'I made the transaction under ID UPI-992384. Please verify.', createdAt: makeDate(1) }
      ]
    });
    await t1.save();

    const t2 = new SupportTicket({
      restaurant: osteria._id,
      title: 'Customizing QR code templates',
      description: 'How do I add our custom logo in the center of the QR code image? The option is greyed out.',
      category: 'QR Code',
      status: 'In Progress',
      priority: 'Medium',
      messages: [
        { sender: 'Restaurant', text: 'Please activate custom QR design.', createdAt: makeDate(2) },
        { sender: 'SuperAdmin', text: 'Hi Giovanni, custom QR design is exclusive to the Enterprise Plan. We see you are on Enterprise, so it should be active. Let us check.', createdAt: makeDate(1) }
      ]
    });
    await t2.save();

    const t3 = new SupportTicket({
      restaurant: sushi._id,
      title: 'SMTP settings connection timeout',
      description: 'We get a connection timeout error when saving our custom mail server settings.',
      category: 'Technical',
      status: 'Closed',
      priority: 'High',
      messages: [
        { sender: 'Restaurant', text: 'Error code: ETIMEDOUT 587.', createdAt: makeDate(5) },
        { sender: 'SuperAdmin', text: 'This happens if port 587 is blocked by your email provider, or if SSL/TLS toggle is mismatched. Try port 465 with SSL enabled.', createdAt: makeDate(4) },
        { sender: 'Restaurant', text: 'Port 465 worked perfectly. Thanks for the quick support!', createdAt: makeDate(3) }
      ]
    });
    await t3.save();

    console.log('Created support tickets...');

    // 10. Seed System Notifications & Logs
    const n1 = new Notification({
      title: 'Maintenance scheduled',
      message: 'Platform database optimization is scheduled for Sunday at 02:00 AM. Expect up to 10 minutes of intermittent connectivity.',
      type: 'global'
    });
    await n1.save();

    const n2 = new Notification({
      title: 'Sushi House subscription expired',
      message: 'Sushi House subscription has expired. Grace period is active for 3 more days.',
      type: 'expiry',
      recipient: sushi._id
    });
    await n2.save();

    const logs = [
      { action: 'Database Seeded', details: 'Initial sandbox database initialized with premium seed data', performedBy: 'System' },
      { action: 'Create Plan', details: 'Created Basic, Pro and Enterprise pricing structures', performedBy: 'Global Administrator' },
      { action: 'Create Restaurant', details: 'Registered natkhat and Osteria Bella accounts', performedBy: 'Global Administrator' },
      { action: 'Auto-Expiry Check', details: 'Flagged Sushi House subscription as expired', performedBy: 'System Cron' }
    ];

    for (const l of logs) {
      const log = new AuditLog(l);
      await log.save();
    }

    console.log('Created system logs and announcements...');

    console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodaas')
  .then(() => seed())
  .catch(err => {
    console.error('MongoDB connection error in seeder:', err);
    process.exit(1);
  });
