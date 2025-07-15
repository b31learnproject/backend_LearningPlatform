const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [150, 'Course title cannot exceed 150 characters'],
    },
    syllabus: {
      type: String,
      trim: true,
      maxlength: [2000, 'Syllabus cannot exceed 2000 characters'],
    },
    duration: {
      type: String,
      required: [true, 'Course duration is required'],
      trim: true,
      maxlength: [50, 'Duration cannot exceed 50 characters'],
    },
    startDate: {
      type: Date,
      required: [true, 'Course start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'Course end date is required'],
      validate: {
        validator: function (value) {
          return !this.startDate || value > this.startDate;
        },
        message: 'End date must be after start date',
      },
    },
    category: {
      type: String,
      enum: [
        'Mathematics',
        'Physics',
        'Chemistry',
        'Biology',
        'Engineering',
        'Science and Technology',
        'Programming and Web Development',
        'Commerce and Management',
      ],
      required: [true, 'Course category is required'],
    },
    venue: {
      type: String,
      enum: ['Online', 'Face to Face', 'Offline'],
      required: [true, 'Venue is required'],
    },
    medium: {
      type: String,
      enum: ['English', 'Tamil', 'Sinhala'],
      required: [true, 'Medium of instruction is required'],
    },
    fee: {
      type: Number,
      min: [0, 'Fee cannot be negative'],
      required: [true, 'Course fee is required'],
    },
    classTimes: [
      {
        day: {
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          required: true,
        },
        startTime: {
          type: String,
          required: true,
          validate: {
            validator: (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value),
            message: 'Invalid start time format (HH:mm)',
          },
        },
        endTime: {
          type: String,
          required: true,
          validate: {
            validator: (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value),
            message: 'Invalid end time format (HH:mm)',
          },
        },
      },
    ],
    educator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Educator is required'],
    },
    image: { // ✅ Renamed from courseImage
      type: String,
      default: '', // fallback if no image is uploaded
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

courseSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Course', courseSchema);
