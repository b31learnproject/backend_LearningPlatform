const mongoose = require('mongoose');

// ✅ Subdocument schema for individual answers
const answerSchema = new mongoose.Schema(
  {
    questionIndex: {
      type: Number,
      required: true,
      min: [0, 'Question index must be a non-negative integer'],
    },
    selectedOption: {
      type: Number,
      required: true,
      min: [0, 'Selected option must be a non-negative integer'],
    },
  },
  { _id: false }
);

// ✅ Main quiz attempt schema
const quizAttemptSchema = new mongoose.Schema(
  {
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    answers: {
      type: [answerSchema],
      validate: {
        validator: function (val) {
          return val.length > 0;
        },
        message: 'Answers must contain at least one entry',
      },
    },
    score: {
      type: Number,
      required: true,
      min: [0, 'Score cannot be negative'],
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: [1, 'Total questions must be at least 1'],
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Prevent duplicate attempts by same learner on same quiz
quizAttemptSchema.index({ learner: 1, quiz: 1 }, { unique: true });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
