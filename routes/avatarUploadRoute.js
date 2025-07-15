const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const fs = require('fs');

// Setup storage engine with Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/avatars');
    fs.mkdirSync(uploadPath, { recursive: true }); // Ensure directory exists
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Unique filename: userId + timestamp + extension
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user._id}-${Date.now()}${ext}`);
  },
});

// File filter: only accept image files (jpeg, jpg, png, gif)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only jpeg, jpg, png, and gif are allowed.'));
  }
};

// Limit file size to 5 MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('avatar');

// @route   POST /api/v1/avatar/upload
// @desc    Upload or update user avatar
// @access  Private
router.post('/upload', protect, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      // Delete old avatar if exists
      const user = await User.findById(req.user._id);
      if (user.avatarUrl) {
        const oldPath = path.join(__dirname, '../', user.avatarUrl);
        fs.unlink(oldPath, (unlinkErr) => {
          // Ignore errors here, just log if any
          if (unlinkErr) console.error('Failed to delete old avatar:', unlinkErr);
        });
      }

      // Save new avatar path in user document (relative path)
      user.avatarUrl = `uploads/avatars/${req.file.filename}`;
      await user.save();

      res.json({ message: 'Avatar uploaded successfully', avatarUrl: user.avatarUrl });
    } catch (error) {
      console.error('Error updating avatar:', error);
      res.status(500).json({ message: 'Server error while updating avatar' });
    }
  });
});

module.exports = router;
