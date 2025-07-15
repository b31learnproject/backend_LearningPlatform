const mongoose = require('mongoose');

const doubtSessionSchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      required: [true, 'Doubt session topic is required'],
      trim: true,
      maxlength: [200, 'Topic cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    educator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Assuming educator is a User with role 'educator'
      required: [true, 'Educator reference is required'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Associated course is required'],
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
      validate: {
        validator: function (value) {
          // Scheduled date must be in the future
          return value > Date.now();
        },
        message: 'Scheduled date must be a future date',
      },
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
      max: [180, 'Duration cannot exceed 180 minutes'],
    },
    link: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          // Simple URL validation regex
          return !v || /^(https?:\/\/)?([\w.-]+)+(:\d+)?(\/([\w/_.]*)?)?$/.test(v);
        },
        message: 'Invalid URL format',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

module.exports = mongoose.model('DoubtSession', doubtSessionSchema);
