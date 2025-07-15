// backend/routes/studentRoutes.js

const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Submission = require('../models/Submission');

const { protect, authorizeRoles } = require('../middleware/auth');

// ==============================
// Learner-Specific Routes
// ==============================

// @route   GET /api/v1/students/me
// @desc    Get current logged-in learner profile
// @access  Private (learner)
router.get(
  '/me',
  protect,
  authorizeRoles('learner'),
  asyncHandler(async (req, res) => {
    const student = await User.findById(req.user._id).select('-password');
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }
    res.json(student);
  })
);

// @route   PATCH /api/v1/students/profile
// @desc    Update current learner profile
// @access  Private (learner)
router.patch(
  '/profile',
  protect,
  authorizeRoles('learner'),
  asyncHandler(async (req, res) => {
    const student = await User.findById(req.user._id);
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    const {
      firstName,
      lastName,
      phone,
      address,
      country,
      avatarUrl,
      dob,
      sex,
    } = req.body;

    if (firstName !== undefined) student.firstName = firstName;
    if (lastName !== undefined) student.lastName = lastName;
    if (phone !== undefined) student.phone = phone;
    if (address !== undefined) student.address = address;
    if (country !== undefined) student.country = country;
    if (avatarUrl !== undefined) student.avatarUrl = avatarUrl;
    if (dob !== undefined) student.dob = dob;
    if (sex !== undefined) student.sex = sex;

    const updatedStudent = await student.save();
    res.json(updatedStudent);
  })
);

// @route   GET /api/v1/students/enrollments
// @desc    Get all enrollments for logged-in learner
// @access  Private (learner)
router.get(
  '/enrollments',
  protect,
  authorizeRoles('learner'),
  asyncHandler(async (req, res) => {
    const enrollments = await Enrollment.find({ learner: req.user._id })
      .populate('course', 'title category startDate endDate')
      .sort({ enrollmentDate: -1 });

    res.json(enrollments);
  })
);

// @route   GET /api/v1/students/submissions
// @desc    Get all submissions by logged-in learner
// @access  Private (learner)
router.get(
  '/submissions',
  protect,
  authorizeRoles('learner'),
  asyncHandler(async (req, res) => {
    const submissions = await Submission.find({ learner: req.user._id })
      .populate({
        path: 'assignment',
        select: 'name dueDate course',
        populate: { path: 'course', select: 'title' },
      })
      .sort({ submittedAt: -1 });

    res.json(submissions);
  })
);

// ==============================
// Coordinator-Specific Routes
// ==============================

// @route   GET /api/v1/students
// @desc    Get all learners for management
// @access  Private (coordinator)
router.get(
  '/',
  protect,
  authorizeRoles('coordinator'),
  asyncHandler(async (req, res) => {
    const learners = await User.find({ role: 'learner' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(learners);
  })
);

module.exports = router;
