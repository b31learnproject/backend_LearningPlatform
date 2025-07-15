const mongoose = require('mongoose');

const studyPlanSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Associated course is required'],
    },
    educator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Assuming educator is a User with role 'educator'
      required: [true, 'Educator reference is required'],
    },
    title: {
      type: String,
      required: [true, 'Study plan title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    schedule: [
      {
        date: {
          type: Date,
          required: [true, 'Schedule date is required'],
        },
        topic: {
          type: String,
          required: [true, 'Topic is required'],
          trim: true,
          maxlength: [300, 'Topic cannot exceed 300 characters'],
        },
        notesUrl: {
          type: String,
          trim: true,
          validate: {
            validator: function (v) {
              return !v || /^(https?:\/\/)?([\w.-]+)+(:\d+)?(\/([\w/_.]*)?)?$/.test(v);
            },
            message: 'Invalid URL format',
          },
        },
      },
    ],
    materials: [
      {
        fileName: {
          type: String,
          required: true,
        },
        fileUrl: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
