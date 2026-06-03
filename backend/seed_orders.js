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
const Order = require('./models/Order');
const QRCode = require('./models/QRCode');

const restaurantId = '4b80a6fc0ca86e62a5998638';

const generateId = () => Math.random().toString(36).substring(2, 10).toUpperCase();

const mockOrders = [
  {
    restaurant: restaurantId,
    orderId: generateId(),
    tableName: 'Table 1',
    customerName: 'John Doe',
    items: [
      { name: 'Paneer Butter Masala', price: 250, quantity: 2 },
      { name: 'Garlic Naan', price: 50, quantity: 4 }
    ],
    totalAmount: 700,
    paymentStatus: 'Pending',
    status: 'Preparing',
    eta: '10 min',
    createdAt: new Date(Date.now() - 15 * 60000)
  },
  {
    restaurant: restaurantId,
    orderId: generateId(),
    tableName: 'Table 3',
    customerName: 'Jane Smith',
    items: [
      { name: 'Chicken Biryani', price: 300, quantity: 1 }
    ],
    totalAmount: 300,
    paymentStatus: 'Paid',
    status: 'Ready',
    eta: '0 min',
    createdAt: new Date(Date.now() - 25 * 60000)
  },
  {
    restaurant: restaurantId,
    orderId: generateId(),
    tableName: 'Table 4',
    customerName: 'Alice',
    items: [
      { name: 'Butter Chicken', price: 320, quantity: 1 },
      { name: 'Tandoori Roti', price: 30, quantity: 3 }
    ],
    totalAmount: 410,
    paymentStatus: 'Pending',
    status: 'Accepted',
    eta: '20 min',
    createdAt: new Date(Date.now() - 5 * 60000)
  },
  {
    restaurant: restaurantId,
    orderId: generateId(),
    tableName: 'Table 7',
    customerName: 'Bob',
    items: [
      { name: 'Jeera Rice', price: 120, quantity: 1 },
      { name: 'Dal Makhani', price: 200, quantity: 1 }
    ],
    totalAmount: 320,
    paymentStatus: 'Paid',
    status: 'Served',
    eta: '0 min',
    createdAt: new Date(Date.now() - 45 * 60000)
  },
  {
    restaurant: restaurantId,
    orderId: generateId(),
    tableName: 'Table 2',
    customerName: 'Charlie',
    items: [
      { name: 'Vegetable Pulao', price: 150, quantity: 2 },
      { name: 'Gulab Jamun', price: 80, quantity: 4 }
    ],
    totalAmount: 620,
    paymentStatus: 'Pending',
    status: 'New Order',
    eta: '25 min',
    createdAt: new Date(Date.now() - 2 * 60000)
  }
];

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  await Order.insertMany(mockOrders);
  console.log('Successfully seeded 5 orders!');
  
  // Also seed some tables just in case QRCodes are empty
  const existingQrs = await QRCode.find({ restaurant: restaurantId });
  const count = existingQrs.length;
  if (count === 0) {
    const qrs = Array.from({length: 12}).map((_, i) => ({
      restaurant: restaurantId,
      tableName: `Table ${i+1}`,
      qrImageUrl: 'https://example.com/qr',
      qrId: generateId()
    }));
    await QRCode.insertMany(qrs);
    console.log('Seeded 12 QR Codes/Tables.');
  }

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
