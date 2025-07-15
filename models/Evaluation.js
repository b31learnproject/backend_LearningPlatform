const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema(
  {
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Assuming User role 'learner'
      required: [true, 'Learner reference is required'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    educator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Assuming User role 'educator'
      required: [true, 'Educator reference is required'],
    },
    feedback: {
      type: String,
      required: [true, 'Feedback is required'],
      trim: true,
      maxlength: [2000, 'Feedback cannot exceed 2000 characters'],
    },
    grade: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E', 'F', 'Incomplete', 'Pass', 'Fail'], // Customize grading scale as needed
      default: 'Incomplete',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index to prevent multiple evaluations for the same learner-course pair
evaluationSchema.index({ learner: 1, course: 1 }, { unique: true });

// Middleware to update updatedAt before save
evaluationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Evaluation', evaluationSchema);
