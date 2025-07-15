const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const DoubtSession = require('../models/DoubtSession');
const { protect, authorizeRoles } = require('../middleware/auth');

// @route   POST /api/v1/doubts
// @desc    Create a new doubt session
// @access  Private (educator, coordinator)
router.post(
  '/',
  protect,
  authorizeRoles('educator', 'coordinator'),
  asyncHandler(async (req, res) => {
    const { topic, description, course, scheduledDate, durationMinutes, link } = req.body;

    // Basic validation
    if (!topic || !course || !scheduledDate || !durationMinutes) {
      res.status(400);
      throw new Error('Topic, course, scheduledDate, and durationMinutes are required');
    }

    const newSession = await DoubtSession.create({
      topic,
      description,
      course,
      scheduledDate,
      durationMinutes,
      link,
      educator: req.user._id,
    });

    res.status(201).json(newSession);
  })
);

// @route   GET /api/v1/doubts
// @desc    Get all doubt sessions
// @access  Private (all authenticated users)
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const sessions = await DoubtSession.find()
      .populate('educator', 'firstName lastName email')
      .populate('course', 'title')
      .sort({ scheduledDate: 1 });

    res.json(sessions);
  })
);

// @route   GET /api/v1/doubts/:id
// @desc    Get doubt session by ID
// @access  Private
router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const session = await DoubtSession.findById(req.params.id)
      .populate('educator', 'firstName lastName email')
      .populate('course', 'title');

    if (!session) {
      res.status(404);
      throw new Error('Doubt session not found');
    }

    res.json(session);
  })
);

// @route   PATCH /api/v1/doubts/:id
// @desc    Update a doubt session
// @access  Private (owner educator or coordinator)
router.patch(
  '/:id',
  protect,
  authorizeRoles('educator', 'coordinator'),
  asyncHandler(async (req, res) => {
    const session = await DoubtSession.findById(req.params.id);

    if (!session) {
      res.status(404);
      throw new Error('Doubt session not found');
    }

    // Authorization: only owner educator or coordinator
    const role = req.user.role;
    const userId = req.user._id;
    if (session.educator.toString() !== userId.toString() && role !== 'coordinator') {
      res.status(403);
      throw new Error('Not authorized to update this session');
    }

    const {
      topic,
      description,
      course,
      scheduledDate,
      durationMinutes,
      link,
      isActive,
    } = req.body;

    if (topic !== undefined) session.topic = topic;
    if (description !== undefined) session.description = description;
    if (course !== undefined) session.course = course;
    if (scheduledDate !== undefined) session.scheduledDate = scheduledDate;
    if (durationMinutes !== undefined) session.durationMinutes = durationMinutes;
    if (link !== undefined) session.link = link;
    if (isActive !== undefined) session.isActive = isActive;

    const updatedSession = await session.save();
    res.json(updatedSession);
  })
);

// @route   DELETE /api/v1/doubts/:id
// @desc    Delete a doubt session
// @access  Private (owner educator or coordinator)
router.delete(
  '/:id',
  protect,
  authorizeRoles('educator', 'coordinator'),
  asyncHandler(async (req, res) => {
    const session = await DoubtSession.findById(req.params.id);

    if (!session) {
      res.status(404);
      throw new Error('Doubt session not found');
    }

    const role = req.user.role;
    const userId = req.user._id;
    if (session.educator.toString() !== userId.toString() && role !== 'coordinator') {
      res.status(403);
      throw new Error('Not authorized to delete this session');
    }

    await session.remove();
    res.json({ message: 'Doubt session deleted successfully' });
  })
);

module.exports = router;
