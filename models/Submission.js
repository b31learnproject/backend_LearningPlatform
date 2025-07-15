const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment reference is required'],
    },
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Assuming User with role 'learner'
      required: [true, 'Learner reference is required'],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    fileUrl: {
      type: String,
      required: [true, 'Submission file URL/path is required'],
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['submitted', 'graded', 'late', 'resubmitted'],
      default: 'submitted',
    },
    grade: {
      type: Number,
      min: [0, 'Grade cannot be negative'],
      max: [100, 'Grade cannot exceed 100'],
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: [2000, 'Feedback cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Compound index to prevent multiple submissions by the same learner for the same assignment (optional)
// submissionSchema.index({ assignment: 1, learner: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
