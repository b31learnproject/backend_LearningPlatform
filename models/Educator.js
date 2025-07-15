const mongoose = require('mongoose');

const educatorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Associated user is required'],
      unique: true,
    },
    qualifications: {
      type: String,
      trim: true,
      maxlength: [500, 'Qualifications cannot exceed 500 characters'],
    },
    experienceYears: {
      type: Number,
      min: [0, 'Experience cannot be negative'],
      max: [50, 'Experience seems too high'],
      default: 0,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Biography cannot exceed 1000 characters'],
    },
    avatarUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          // Simple URL validation, allow empty
          return !v || /^(https?:\/\/)?([\w.-]+)+(:\d+)?(\/([\w/_.]*)?)?$/.test(v);
        },
        message: 'Invalid URL format for avatar',
      },
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          // Basic phone validation: digits, spaces, +, -, ()
          return !v || /^[\d+\-\s\(\)]+$/.test(v);
        },
        message: 'Invalid phone number format',
      },
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country name too long'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Educator', educatorSchema);
