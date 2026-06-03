const Category = require('../models/Category');

// @desc    Get all categories for the logged-in restaurant
// @route   GET /api/categories
// @access  Private
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ restaurantId: req.restaurant.id }).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Add a new category
// @route   POST /api/categories
// @access  Private
const addCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Check if category already exists for this restaurant
    const existingCategory = await Category.findOne({
      restaurantId: req.restaurant.id,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const newCategory = new Category({
      restaurantId: req.restaurant.id,
      name: name.trim()
    });

    const category = await newCategory.save();
    res.status(201).json(category);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getCategories,
  addCategory,
};
