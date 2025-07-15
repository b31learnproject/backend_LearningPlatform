// backend/routes/quizAttemptRoutes.js
const express = require('express');
const router = express.Router();
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const { protect } = require('../middleware/auth');
const quizAttemptController = require('../controllers/quizAttemptController');

// ✅ Submit a new quiz attempt with scoring (main route)
router.post('/', protect, quizAttemptController.submitQuiz);

// ✅ Fallback route for same controller (optional)
router.post('/controller', protect, quizAttemptController.submitQuiz);

// ✅ Get all attempts by current learner
router.get('/my/all', protect, quizAttemptController.getMyAttempts);

// ✅ Check if learner already attempted a specific quiz
router.get('/my/:quizId', protect, async (req, res) => {
  try {
    const attempt = await QuizAttempt.findOne({
      learner: req.user.id,
      quiz: req.params.quizId,
    });
    res.json({ attempted: !!attempt });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ Raw attempt submission (legacy/fallback - not recommended for production)
router.post('/raw', protect, async (req, res) => {
  try {
    const { quiz, answers, score, totalQuestions } = req.body;

    if (!quiz || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: 'Quiz ID and answers are required' });
    }

    const existing = await QuizAttempt.findOne({ learner: req.user.id, quiz });
    if (existing) {
      return res.status(400).json({ message: 'You have already attempted this quiz.' });
    }

    const quizDoc = await Quiz.findById(quiz);
    if (!quizDoc) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const newAttempt = new QuizAttempt({
      learner: req.user.id,
      quiz,
      answers,
      score,
      totalQuestions,
      attemptedAt: new Date(),
    });

    const saved = await newAttempt.save();

    await Quiz.findByIdAndUpdate(
      quiz,
      { $push: { submissions: { learner: req.user.id, score } } },
      { new: true }
    );

    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Failed to save attempt', error: err.message });
  }
});

module.exports = router;
