require('dotenv').config();

if (process.env.USE_MOCK_DB === 'true') {
  console.log('--- RUNNING WITH MOCK DATABASE (mockMongoose.js) ---');
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

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Attach io to the app so controllers can use it
app.set('io', io);

// Handle socket connections
io.on('connection', (socket) => {
  console.log('A user connected via Socket.IO');

  socket.on('joinRestaurantRoom', (restaurantId) => {
    socket.join(restaurantId);
    console.log(`Socket joined room: ${restaurantId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/menu', require('./routes/foodRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/qrcodes', require('./routes/qrRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/superadmin', require('./routes/superAdminRoutes'));

// Basic Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

app.get('/api/status', (req, res) => {
  res.json({ message: 'Backend and Frontend are successfully connected!', status: 'success' });
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
