const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const quizController = require('../controllers/quizController');

// ✅ Create a new quiz
router.post('/', protect, authorizeRoles('educator', 'coordinator'), quizController.createQuiz);

// ✅ Get all quizzes (optional filter)
router.get('/', protect, quizController.getQuizzesWithFilter);

// ✅ Get quizzes created by educator
router.get('/educator', protect, authorizeRoles('educator'), quizController.getQuizzesByEducator);

// ✅ Get available quizzes (for learners)
router.get('/available', protect, authorizeRoles('learner'), quizController.getAvailableQuizzes);



// ✅ Get a specific quiz
router.get('/:id', protect, quizController.getQuizById);

// ✅ Submit quiz
router.post('/:id/submit', protect, authorizeRoles('learner'), quizController.submitQuiz);

// ✅ Update quiz
router.patch('/:id', protect, authorizeRoles('educator', 'coordinator'), quizController.updateQuiz);

// ✅ Delete quiz
router.delete('/:id', protect, authorizeRoles('educator', 'coordinator'), quizController.deleteQuiz);

// ✅ Publish quiz
router.patch('/publish/:id', protect, authorizeRoles('educator', 'coordinator'), quizController.publishQuiz);

// ✅ Coordinator: Get all quizzes with learner attempts
router.get('/with-learners', protect, authorizeRoles('coordinator'), quizController.getQuizzesWithLearnerAttempts);

module.exports = router;
