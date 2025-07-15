const Quiz = require('../models/Quiz');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const asyncHandler = require('express-async-handler');

// ✅ Create a new quiz
exports.createQuiz = asyncHandler(async (req, res) => {
  const {
    title,
    course,
    questions,
    scheduledDateTime,
    durationMinutes = 30,
    published = false
  } = req.body;

  if (!title || !course || !questions || !Array.isArray(questions) || questions.length === 0) {
    res.status(400);
    throw new Error('Title, course, and at least one question are required');
  }

  if (!scheduledDateTime) {
    res.status(400);
    throw new Error('Scheduled date and time is required');
  }

  const courseDoc = await Course.findById(course);
  if (!courseDoc) {
    res.status(404);
    throw new Error('Course not found');
  }

  for (let i = 0; i < questions.length; i++) {
    if (questions[i].correctAnswerIndex === undefined) {
      res.status(400);
      throw new Error(`Question ${i + 1} is missing correctAnswerIndex`);
    }
  }

  const quiz = await Quiz.create({
    title,
    course,
    educator: req.user._id,
    questions,
    scheduledDateTime: scheduledDateTime || new Date(), // Default to current time if not provided
    availableFrom: scheduledDateTime || new Date(), // Set both fields initially
    durationMinutes,
    published
  });

  res.status(201).json(quiz);
});

// ✅ Get all quizzes with optional filter (e.g., course)
exports.getQuizzesWithFilter = asyncHandler(async (req, res) => {
  const { course } = req.query;
  const filter = {};
  if (course) filter.course = course;

  const quizzes = await Quiz.find(filter)
    .populate('course', 'title')
    .populate('educator', 'firstName lastName email')
    .sort({ createdAt: -1 });

  res.json(quizzes);
});

// ✅ Get quizzes created by the logged-in educator
exports.getQuizzesByEducator = asyncHandler(async (req, res) => {
  const quizzes = await Quiz.find({ educator: req.user._id })
    .populate('course', 'title')
    .sort({ createdAt: -1 });

  res.json(quizzes);
});

// ✅ Get available quizzes for a learner
exports.getAvailableQuizzes = asyncHandler(async (req, res) => {
  const learnerId = req.user._id;
  const today = new Date();

  const enrollments = await Enrollment.find({ learner: learnerId }).select('course status paymentStatus createdAt');

  const eligibleCourseIds = enrollments
    .filter(e => {
      const enrolledDate = new Date(e.createdAt);
      const daysSinceEnroll = (today - enrolledDate) / (1000 * 60 * 60 * 24);
      return (e.paymentStatus === 'success' && (e.status === 'active' || e.status === 'completed')) || daysSinceEnroll <= 7;
    })
    .map(e => e.course.toString());



  const quizzes = await Quiz.find({
    published: true,
    course: { $in: eligibleCourseIds },
    $or: [
      { availableFrom: { $lte: today } },
      { availableFrom: { $exists: false }, scheduledDateTime: { $lte: today } },
      { availableFrom: { $exists: false }, scheduledDateTime: { $exists: false } }, // Both undefined - make available immediately
      { scheduledDateTime: null }, // Handle null values
      { availableFrom: null } // Handle null values
    ]
  })
    .populate('course', 'title')
    .populate('educator', 'firstName lastName')
    .sort({ createdAt: -1 });

  res.status(200).json(quizzes);
});

// ✅ Get a specific quiz by ID (must be available to learner)
exports.getQuizById = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id)
    .populate('course', 'title')
    .populate('educator', 'firstName lastName email');

  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  const now = new Date();
  const availableDate = quiz.availableFrom || quiz.scheduledDateTime;
  if (!quiz.published || new Date(availableDate) > now) {
    res.status(403);
    throw new Error('Quiz is not yet available');
  }

  res.json(quiz);
});

// ✅ Update a quiz
exports.updateQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  if (
    quiz.educator.toString() !== req.user._id.toString() &&
    req.user.role !== 'coordinator'
  ) {
    res.status(403);
    throw new Error('Not authorized to update this quiz');
  }

  const { title, questions, durationMinutes, scheduledDateTime, published } = req.body;

  if (title !== undefined) quiz.title = title;
  if (questions !== undefined) quiz.questions = questions;
  if (durationMinutes !== undefined) quiz.durationMinutes = durationMinutes;
  if (scheduledDateTime !== undefined) {
    quiz.scheduledDateTime = scheduledDateTime || new Date();
    quiz.availableFrom = scheduledDateTime || new Date(); // Keep them synced
  }
  if (published !== undefined) quiz.published = published;

  const updatedQuiz = await quiz.save();
  res.json(updatedQuiz);
});

// ✅ Delete a quiz
exports.deleteQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  if (
    quiz.educator.toString() !== req.user._id.toString() &&
    req.user.role !== 'coordinator'
  ) {
    res.status(403);
    throw new Error('Not authorized to delete this quiz');
  }

  await quiz.remove();
  res.json({ message: 'Quiz deleted successfully' });
});

// ✅ Publish a quiz
exports.publishQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  if (
    quiz.educator.toString() !== req.user._id.toString() &&
    req.user.role !== 'coordinator'
  ) {
    res.status(403);
    throw new Error('Not authorized to publish this quiz');
  }

  quiz.published = true;
  await quiz.save();

  res.json({ message: 'Quiz published successfully', quiz });
});

// ✅ Submit quiz (auto-grade + restrict re-submission)
exports.submitQuiz = asyncHandler(async (req, res) => {
  const quizId = req.params.id;
  const learnerId = req.user._id;
  const { answers } = req.body;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  const alreadySubmitted = quiz.submissions.find(
    (s) => s.learner.toString() === learnerId.toString()
  );
  if (alreadySubmitted) {
    res.status(400);
    throw new Error('You have already submitted this quiz');
  }

  let score = 0;
  quiz.questions.forEach((q, i) => {
    if (answers && answers[i] !== undefined && answers[i] === q.correctAnswerIndex) {
      score++;
    }
  });

  quiz.submissions.push({
    learner: learnerId,
    answers,
    score,
  });

  await quiz.save();

  res.status(200).json({
    message: 'Quiz submitted successfully',
    score,
    total: quiz.questions.length,
  });
});



// ✅ Coordinator: View all quizzes with learner scores
exports.getQuizzesWithLearnerAttempts = asyncHandler(async (req, res) => {
  const quizzes = await Quiz.find().populate('course', 'title');
  const attempts = await QuizAttempt.find()
    .populate('quiz', 'title')
    .populate('learner', 'firstName lastName email');

  const response = quizzes.map(quiz => {
    const quizAttempts = attempts.filter(
      attempt => attempt.quiz._id.toString() === quiz._id.toString()
    );

    return {
      quizId: quiz._id,
      quizTitle: quiz.title,
      courseTitle: quiz.course?.title || 'N/A',
      attempts: quizAttempts.map(attempt => ({
        learnerName: `${attempt.learner.firstName} ${attempt.learner.lastName}`,
        learnerEmail: attempt.learner.email,
        score: attempt.score,
        total: attempt.totalQuestions,
      })),
    };
  });

  res.status(200).json(response);
});
