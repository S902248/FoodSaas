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
const Food = require('./models/Food');

const restaurantId = '6a0adc078812fa7015b396d9';

const menuItems = [
  { restaurantId, name: 'Paneer Butter Masala', price: 250, category: 'Main Course', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80' },
  { restaurantId, name: 'Garlic Naan', price: 50, category: 'Breads', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80' },
  { restaurantId, name: 'Chicken Biryani', price: 300, category: 'Rice', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80' },
  { restaurantId, name: 'Dal Makhani', price: 200, category: 'Main Course', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80' },
  { restaurantId, name: 'Tandoori Roti', price: 30, category: 'Breads', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80' },
  { restaurantId, name: 'Vegetable Pulao', price: 150, category: 'Rice', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80' },
  { restaurantId, name: 'Palak Paneer', price: 220, category: 'Main Course', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80' },
  { restaurantId, name: 'Jeera Rice', price: 120, category: 'Rice', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80' },
  { restaurantId, name: 'Butter Chicken', price: 320, category: 'Main Course', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80' },
  { restaurantId, name: 'Gulab Jamun', price: 80, category: 'Dessert', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80' }
];

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  await Food.insertMany(menuItems);
  console.log('Successfully added 10 items to the menu!');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
