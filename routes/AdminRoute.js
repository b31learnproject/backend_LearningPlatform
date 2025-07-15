const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const { protect, authorizeRoles } = require('../middleware/auth');

// Create Assignment
router.post(
  '/',
  protect,
  authorizeRoles('educator', 'coordinator'),
  asyncHandler(async (req, res) => {
    const { name, course, dueDate, description, maxScore } = req.body;
    const userId = req.user._id;
    const role = req.user.role;

    if (!name || !course || !dueDate) {
      res.status(400);
      throw new Error('Name, course, and due date are required');
    }

    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      res.status(404);
      throw new Error('Course not found');
    }

    if (role === 'educator' && courseDoc.educator.toString() !== userId.toString()) {
      res.status(403);
      throw new Error('Not authorized to create assignment for this course');
    }

    const assignment = await Assignment.create({
      name,
      course,
      educator: userId,
      dueDate,
      description,
      maxScore,
    });

    res.status(201).json(assignment);
  })
);

// Get All Assignments
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.course) {
      filter.course = req.query.course;
    }

    const assignments = await Assignment.find(filter)
      .populate('course', 'title')
      .populate('educator', 'firstName lastName email')
      .sort({ dueDate: 1 });

    res.json(assignments);
  })
);

// Get Assignment by ID
router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const assignment = await Assignment.findById(req.params.id)
      .populate('course', 'title')
      .populate('educator', 'firstName lastName email');

    if (!assignment) {
      res.status(404);
      throw new Error('Assignment not found');
    }

    res.json(assignment);
  })
);

// Update Assignment
router.patch(
  '/:id',
  protect,
  authorizeRoles('educator', 'coordinator'),
  asyncHandler(async (req, res) => {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      res.status(404);
      throw new Error('Assignment not found');
    }

    const userId = req.user._id;
    const role = req.user.role;

    if (assignment.educator.toString() !== userId.toString() && role !== 'coordinator') {
      res.status(403);
      throw new Error('Not authorized to update this assignment');
    }

    const { name, dueDate, description, maxScore } = req.body;

    if (name !== undefined) assignment.name = name;
    if (dueDate !== undefined) assignment.dueDate = dueDate;
    if (description !== undefined) assignment.description = description;
    if (maxScore !== undefined) assignment.maxScore = maxScore;

    const updatedAssignment = await assignment.save();
    res.json(updatedAssignment);
  })
);

// Delete Assignment
router.delete(
  '/:id',
  protect,
  authorizeRoles('educator', 'coordinator'),
  asyncHandler(async (req, res) => {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      res.status(404);
      throw new Error('Assignment not found');
    }

    const userId = req.user._id;
    const role = req.user.role;

    if (assignment.educator.toString() !== userId.toString() && role !== 'coordinator') {
      res.status(403);
      throw new Error('Not authorized to delete this assignment');
    }

    await assignment.remove();
    res.json({ message: 'Assignment removed successfully' });
  })
);

module.exports = router;
