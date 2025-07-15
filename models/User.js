// Learning_platform/backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please use a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Exclude password from query results by default
    },
    dob: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    sex: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: [true, 'Sex is required'],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
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
    role: {
      type: String,
      enum: ['admin', 'coordinator', 'educator', 'learner'],
      default: 'learner',
      required: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    // ✅ ADDED: This field allows coordinators to deactivate educator accounts
    isActive: {
      type: Boolean,
      default: true,
    },
    // ✅ NEW: Admin approval required for coordinators and educators
    isApproved: {
      type: Boolean,
      default: function() {
        // Auto-approve learners and admins, require approval for coordinators and educators
        return this.role === 'learner' || this.role === 'admin';
      },
    },
  },
  {
    timestamps: true,
  }
);

// Password hashing middleware before saving user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);