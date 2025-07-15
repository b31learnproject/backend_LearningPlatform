const asyncHandler = require('express-async-handler');
const Evaluation = require('../models/Evaluation');
const User = require('../models/User');
const Course = require('../models/Course');

// @desc    Create a new evaluation
// @route   POST /api/v1/evaluations
// @access  Private (educator, coordinator)
exports.createEvaluation = asyncHandler(async (req, res) => {
  const { learner, course, feedback, grade } = req.body;

  if (!learner || !course || !feedback) {
    res.status(400);
    throw new Error('Learner, course, and feedback are required');
  }

  // Validate user role and existence
  const learnerUser = await User.findById(learner);
  if (!learnerUser || learnerUser.role !== 'learner') {
    res.status(400);
    throw new Error('Invalid learner');
  }

  const courseDoc = await Course.findById(course);
  if (!courseDoc) {
    res.status(400);
    throw new Error('Invalid course');
  }

  // Prevent duplicate evaluation for the same learner-course pair
  const existingEval = await Evaluation.findOne({ learner, course });
  if (existingEval) {
    res.status(409);
    throw new Error('Evaluation already exists for this learner and course');
  }

  // Only educator or coordinator can create evaluations
  if (!['educator', 'coordinator'].includes(req.user.role)) {
    res.status(403);
    throw new Error('Not authorized to create evaluations');
  }

  const evaluation = await Evaluation.create({
    learner,
    course,
    educator: req.user._id,
    feedback,
    grade: grade || 'Incomplete',
  });

  res.status(201).json(evaluation);
});

// @desc    Get paginated list of evaluations
// @route   GET /api/v1/evaluations
// @access  Private
exports.getAllEvaluations = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const skip = (page - 1) * limit;

  const total = await Evaluation.countDocuments();
  const evaluations = await Evaluation.find()
    .populate('learner', 'firstName lastName email')
    .populate('course', 'title')
    .populate('educator', 'firstName lastName email')
    .skip(skip)
    .limit(limit);

  res.json({
    count: evaluations.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: evaluations,
  });
});

// @desc    Get single evaluation by ID
// @route   GET /api/v1/evaluations/:id
// @access  Private
exports.getEvaluationById = asyncHandler(async (req, res) => {
  const evaluation = await Evaluation.findById(req.params.id)
    .populate('learner', 'firstName lastName email')
    .populate('course', 'title')
    .populate('educator', 'firstName lastName email');

  if (!evaluation) {
    res.status(404);
    throw new Error('Evaluation not found');
  }

  res.json(evaluation);
});

// @desc    Update evaluation
// @route   PATCH /api/v1/evaluations/:id
// @access  Private (owner educator or coordinator)
exports.updateEvaluation = asyncHandler(async (req, res) => {
  const evaluation = await Evaluation.findById(req.params.id);

  if (!evaluation) {
    res.status(404);
    throw new Error('Evaluation not found');
  }

  // Only the educator who created it or coordinator can update
  if (
    evaluation.educator.toString() !== req.user._id.toString() &&
    req.user.role !== 'coordinator'
  ) {
    res.status(403);
    throw new Error('Not authorized to update this evaluation');
  }

  const { feedback, grade } = req.body;

  if (feedback !== undefined) evaluation.feedback = feedback;
  if (grade !== undefined) evaluation.grade = grade;

  const updatedEval = await evaluation.save();
  res.json(updatedEval);
});

// @desc    Delete evaluation
// @route   DELETE /api/v1/evaluations/:id
// @access  Private (owner educator or coordinator)
exports.deleteEvaluation = asyncHandler(async (req, res) => {
  const evaluation = await Evaluation.findById(req.params.id);

  if (!evaluation) {
    res.status(404);
    throw new Error('Evaluation not found');
  }

  if (
    evaluation.educator.toString() !== req.user._id.toString() &&
    req.user.role !== 'coordinator'
  ) {
    res.status(403);
    throw new Error('Not authorized to delete this evaluation');
  }

  await evaluation.remove();
  res.json({ message: 'Evaluation removed successfully' });
});
