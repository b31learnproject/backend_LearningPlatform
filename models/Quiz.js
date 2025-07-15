const mongoose = require('mongoose');

// ✅ Sub-schema for each quiz question
const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswerIndex: { type: Number, required: true }, // Index of the correct option
});

// ✅ Sub-schema for each learner's submission
const submissionSchema = new mongoose.Schema({
  learner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // ✅ Points to User collection (not separate learner collection)
    required: true,
  },
  answers: [{ type: Number, required: true }],
  score: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now },
});

// ✅ Main Quiz schema
const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    educator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // ✅ Stored in 'users' collection with role: 'educator'
      required: true,
    },
    questions: [questionSchema],
    scheduledDateTime: { type: Date, required: true },
    availableFrom: { type: Date }, // When quiz becomes available to learners
    durationMinutes: { type: Number, default: 30 },
    published: { type: Boolean, default: false },

    // ✅ Submissions from learners
    submissions: [submissionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', quizSchema);
