const Food = require('../models/Food');
const Notification = require('../models/Notification');

// @desc    Get all menu items for the logged-in restaurant
// @route   GET /api/menu
// @access  Private
const getMenu = async (req, res) => {
  try {
    const menu = await Food.find({ restaurantId: req.restaurant.id }).sort({ createdAt: -1 });
    res.json(menu);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Add a new food item
// @route   POST /api/menu
// @access  Private
const addFood = async (req, res) => {
  try {
    const { name, price, category, image } = req.body;

    const newFood = new Food({
      restaurantId: req.restaurant.id,
      name,
      price,
      category,
      image: image || undefined,
    });

    const food = await newFood.save();
    res.status(201).json(food);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update a food item
// @route   PUT /api/menu/:id
// @access  Private
const updateFood = async (req, res) => {
  try {
    let food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    // Make sure restaurant owns the food item
    if (food.restaurantId.toString() !== req.restaurant.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    food = await Food.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    // Check if we need to resolve low_stock alerts
    if (food.stock > food.lowStockThreshold) {
      const updatedNotifications = await Notification.updateMany(
        { recipient: req.restaurant.id, productName: food.name, type: 'low_stock', isRead: false },
        { $set: { isRead: true } }
      );
      
      if (updatedNotifications.modifiedCount > 0) {
        const io = req.app.get('io');
        if (io) {
          io.to(req.restaurant.id.toString()).emit('alert_resolved', { productName: food.name });
        }
      }
    }

    res.json(food);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Delete a food item
// @route   DELETE /api/menu/:id
// @access  Private
const deleteFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    // Make sure restaurant owns the food item
    if (food.restaurantId.toString() !== req.restaurant.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await food.deleteOne();
    res.json({ message: 'Food removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getMenu,
  addFood,
  updateFood,
  deleteFood,
};
