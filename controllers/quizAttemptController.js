const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');

// ✅ Submit a new quiz attempt (with automatic scoring)
exports.submitQuiz = async (req, res) => {
  try {
    console.log('🔍 DEBUG: Quiz submission received');
    console.log('🔍 DEBUG: Request body:', req.body);
    console.log('🔍 DEBUG: User ID:', req.user._id);
    
    const { quizId, answers } = req.body;
    const userId = req.user._id;

    // 🔍 Validate inputs
    if (!quizId || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Quiz ID and answers are required' });
    }

    // 🔍 Check if quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // 🚫 Quiz must be published
    if (!quiz.published) {
      return res.status(403).json({ message: 'This quiz is not yet published' });
    }

    // 🕒 Check schedule
    const now = new Date();
    if (quiz.scheduledDateTime && now < new Date(quiz.scheduledDateTime)) {
      return res.status(403).json({
        message: `Quiz not available yet. Scheduled for ${new Date(quiz.scheduledDateTime).toLocaleString()}`,
      });
    }

    // 🛑 Check for duplicate attempt
    const existing = await QuizAttempt.findOne({ learner: userId, quiz: quizId });
    if (existing) {
      return res.status(400).json({ message: 'You have already attempted this quiz' });
    }

    // ✅ Score the quiz
    let score = 0;
    const processedAnswers = quiz.questions.map((q, idx) => {
      const selected = parseInt(answers[idx]);
      const isCorrect = selected === q.correctAnswerIndex;
      if (isCorrect) score++;
      return {
        questionIndex: idx,
        selectedOption: selected,
      };
    });

    // 💾 Save the attempt
    const attempt = await QuizAttempt.create({
      quiz: quizId,
      learner: userId,
      answers: processedAnswers,
      score,
      totalQuestions: quiz.questions.length,
      attemptedAt: now,
    });

    // 🔁 Optionally track attempt in Quiz model (submission summary)
    await Quiz.findByIdAndUpdate(
      quizId,
      { $push: { submissions: { learner: userId, score } } },
      { new: true }
    );

    res.status(201).json({
      message: '✅ Quiz submitted successfully',
      score,
      totalQuestions: quiz.questions.length,
      correctAnswers: quiz.questions.map((q) => q.correctAnswerIndex),
      attemptedAt: now,
    });
  } catch (err) {
    console.error('❌ Quiz submission failed:', err.message);
    res.status(500).json({
      message: 'Server error while submitting quiz',
      error: err.message,
    });
  }
};

// ✅ Get all attempts of the current learner (with quiz and course info)
exports.getMyAttempts = async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ learner: req.user._id })
      .populate({
        path: 'quiz',
        select: 'title durationMinutes course',
        populate: {
          path: 'course',
          select: 'title',
          strictPopulate: false,
        },
        strictPopulate: false,
      })
      .sort({ attemptedAt: -1 })
      .lean();

    // 🧹 Filter out broken or orphaned attempts
    const validAttempts = attempts.filter(
      (a) => a.quiz && a.quiz.title && a.quiz.course && a.quiz.course.title
    );

    res.status(200).json(validAttempts);
  } catch (err) {
    console.error('❌ Error fetching quiz attempts:', err.message);
    res.status(500).json({
      message: '❌ Failed to fetch quiz attempts',
      error: err.message,
    });
  }
};
