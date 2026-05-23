const express = require('express');
const router = express.Router();
const { getMenu, addFood, updateFood, deleteFood } = require('../controllers/foodController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getMenu)
  .post(protect, addFood);

router.route('/:id')
  .put(protect, updateFood)
  .delete(protect, deleteFood);

module.exports = router;
