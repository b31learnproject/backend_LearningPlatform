const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const User = require('../models/User');
const { protect, authorizeRoles } = require('../middleware/auth');

// Token generator
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'defaultsecret', { expiresIn: '7d' });
};

// ✅ Storage for avatar
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${req.user._id}-${Date.now()}${ext}`;
    cb(null, unique);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only images allowed'));
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// ✅ @route   POST /api/v1/users/register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, dob, sex, phone, address, country, role } = req.body;

    if (!firstName || !lastName || !email || !password || !dob || !sex || !role) {
      res.status(400);
      throw new Error('Please fill in all required fields');
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      res.status(400);
      throw new Error('Email already registered');
    }

    // ✅ Let the User model hash the password
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      dob,
      sex,
      phone,
      address,
      country,
      role,
    });

    res.status(201).json({
      _id: user._id,
      firstName,
      lastName,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  })
);

// ✅ @route   POST /api/v1/users/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide email and password');
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      res.status(401);
      throw new Error('Invalid email');
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid password');
    }

    // ✅ Check admin approval for coordinators and educators
    if ((user.role === 'coordinator' || user.role === 'educator') && !user.isApproved) {
      res.status(403);
      throw new Error('Your account is pending admin approval. Please contact the admin.');
    }

    // ✅ Check if educator is active (existing functionality)
    if (user.role === 'educator' && !user.isActive) {
      res.status(403);
      throw new Error('Your account is inactive. Please contact your coordinator.');
    }

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      isApproved: user.isApproved,
      token: generateToken(user._id, user.role),
    });
  })
);

// @route   GET /api/v1/users/profile
router.get(
  '/profile',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    res.json(user);
  })
);

// @route   PATCH /api/v1/users/profile
router.patch(
  '/profile',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const { firstName, lastName, dob, sex, phone, address, country, password, avatarUrl } = req.body;

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (dob !== undefined) user.dob = dob;
    if (sex !== undefined) user.sex = sex;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (country !== undefined) user.country = country;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    if (password) user.password = password; // will be hashed by model

    const updated = await user.save();

    // Return complete user profile data (excluding password)
    const userResponse = updated.toObject();
    delete userResponse.password;

    res.json({
      ...userResponse,
      token: generateToken(updated._id, updated.role),
    });
  })
);

// ✅ @route   POST /api/v1/users/upload-avatar
router.post(
  '/upload-avatar',
  protect,
  avatarUpload.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400);
      throw new Error('No avatar file uploaded');
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Optionally delete previous avatar
    if (user.avatarUrl) {
      const oldPath = path.join(__dirname, '../', user.avatarUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.avatarUrl = `uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({ avatarUrl: user.avatarUrl });
  })
);

// @route   GET /api/v1/users (coordinator only)
router.get(
  '/',
  protect,
  authorizeRoles('coordinator'),
  asyncHandler(async (req, res) => {
    // Build filter based on query parameters
    const filter = {};
    
    // Support role filtering via query parameter
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    // Support isActive filtering for educators
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Support isApproved filtering
    if (req.query.isApproved !== undefined) {
      filter.isApproved = req.query.isApproved === 'true';
    }

    console.log('📊 Users API Filter:', filter);
    console.log('📊 Query params:', req.query);

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    
    console.log('📊 Found users count:', users.length);
    console.log('📊 Found users:', users.map(u => ({ 
      name: `${u.firstName} ${u.lastName}`, 
      role: u.role, 
      isActive: u.isActive, 
      isApproved: u.isApproved 
    })));

    res.json(users);
  })
);

// @route   DELETE /api/v1/users/:id
router.delete(
  '/:id',
  protect,
  authorizeRoles('coordinator'),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    await user.remove();
    res.json({ message: 'User deleted successfully' });
  })
);

module.exports = router;
