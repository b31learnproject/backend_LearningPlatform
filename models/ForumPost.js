const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Associated course is required'],
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      trim: true,
      maxlength: [3000, 'Content cannot exceed 3000 characters'],
    },
    parentPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ForumPost',
      default: null, // Null for top-level posts; set for replies
    },
    // Optionally, add a field to track if post is edited
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt and updatedAt
  }
);

// Index to improve lookup by course and parentPost
forumPostSchema.index({ course: 1, parentPost: 1, createdAt: -1 });

module.exports = mongoose.model('ForumPost', forumPostSchema);
