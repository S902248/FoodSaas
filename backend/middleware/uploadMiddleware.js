const multer = require('multer');
const path = require('path');

// Configure Multer Storage engine for LOCAL disk storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/'); // Save files locally to backend/uploads folder
  },
  filename(req, file, cb) {
    // Generate unique filename
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Configure file filtering to allow only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, and PNG images are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit image size to 5MB
  },
});

module.exports = upload;
