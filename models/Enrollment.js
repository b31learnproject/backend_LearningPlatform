const mongoose = require('mongoose');
const Enrollment = require('../models/Enrollment');

const enrollmentSchema = new mongoose.Schema(
  {
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Assuming learners are Users with role 'learner'
      required: [true, 'Learner reference is required'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'dropped', 'pending'],
      default: 'active',
      required: true,
    },
    progressPercentage: {
      type: Number,
      min: [0, 'Progress cannot be less than 0%'],
      max: [100, 'Progress cannot exceed 100%'],
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'success', // Default to success for now to avoid breaking existing enrollments
    },
  },
  {
    timestamps: true, // createdAt and updatedAt
  }
);

// Add a unique compound index to prevent duplicate enrollments
enrollmentSchema.index({ learner: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
