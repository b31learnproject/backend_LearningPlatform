const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Assignment name is required'],
      trim: true,
      maxlength: [100, 'Assignment name cannot exceed 100 characters'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Associated course is required'],
    },
    educator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Assuming Educator is a user with role 'educator'
      required: [true, 'Educator reference is required'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      validate: {
        validator: function (value) {
          // Due date must be in the future
          return value > Date.now();
        },
        message: 'Due date must be a future date',
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    maxScore: {
      type: Number,
      required: [true, 'Maximum score is required'],
      min: [0, 'Maximum score cannot be negative'],
      default: 100,
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
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Middleware to update updatedAt before save
assignmentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Assignment', assignmentSchema);
