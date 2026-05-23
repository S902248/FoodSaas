const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');

// @desc    Upload an image locally
// @route   POST /api/upload
// @access  Private (Only logged-in restaurant owners can upload)
router.post('/', protect, (req, res) => {
  upload.single('image')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Construct local HTTP URL pointing to our static folder
    // Since backend runs on port 5000:
    const localUrl = `http://localhost:5000/uploads/${req.file.filename}`;

    res.status(200).json({
      message: 'Image uploaded successfully to Local Storage',
      secure_url: localUrl,
      public_id: req.file.filename,
    });
  });
});

module.exports = router;
