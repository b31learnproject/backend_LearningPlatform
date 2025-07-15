const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const ForumPost = require('../models/ForumPost');
const { protect, authorizeRoles } = require('../middleware/auth');

// @route   POST /api/v1/forum
// @desc    Create a new forum post or reply
// @access  Private (all authenticated users)
router.post(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const { content, course, parentPost } = req.body;

    if (!content || !course) {
      res.status(400);
      throw new Error('Content and course are required');
    }

    // Optionally verify course exists if needed (can be added here)

    const newPost = await ForumPost.create({
      author: req.user._id,
      course,
      content,
      parentPost: parentPost || null,
    });

    res.status(201).json(newPost);
  })
);

// @route   GET /api/v1/forum
// @desc    Get all forum posts optionally filtered by course
// @access  Private (all authenticated users)
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const { course } = req.query;

    const filter = {};
    if (course) {
      filter.course = course;
    }

    // Fetch posts sorted by creation date, populate author and course info
    const posts = await ForumPost.find(filter)
      .populate('author', 'firstName lastName email')
      .populate('course', 'title')
      .sort({ createdAt: -1 });

    res.json(posts);
  })
);

// @route   GET /api/v1/forum/:id
// @desc    Get a single forum post by ID with replies
// @access  Private
router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const post = await ForumPost.findById(req.params.id)
      .populate('author', 'firstName lastName email')
      .populate('course', 'title');

    if (!post) {
      res.status(404);
      throw new Error('Forum post not found');
    }

    // Fetch replies to this post
    const replies = await ForumPost.find({ parentPost: post._id })
      .populate('author', 'firstName lastName email')
      .sort({ createdAt: 1 });

    res.json({ post, replies });
  })
);

// @route   PATCH /api/v1/forum/:id
// @desc    Update a forum post (only author or coordinator)
// @access  Private
router.patch(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const post = await ForumPost.findById(req.params.id);

    if (!post) {
      res.status(404);
      throw new Error('Forum post not found');
    }

    // Only author or coordinator can update
    if (
      post.author.toString() !== req.user._id.toString() &&
      req.user.role !== 'coordinator'
    ) {
      res.status(403);
      throw new Error('Not authorized to update this post');
    }

    const { content } = req.body;
    if (content !== undefined) post.content = content;

    // Optionally update isEdited flag
    post.isEdited = true;

    const updatedPost = await post.save();
    res.json(updatedPost);
  })
);

// @route   DELETE /api/v1/forum/:id
// @desc    Delete a forum post (only author or coordinator)
// @access  Private
router.delete(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const post = await ForumPost.findById(req.params.id);

    if (!post) {
      res.status(404);
      throw new Error('Forum post not found');
    }

    if (
      post.author.toString() !== req.user._id.toString() &&
      req.user.role !== 'coordinator'
    ) {
      res.status(403);
      throw new Error('Not authorized to delete this post');
    }

    // Also delete replies if needed
    await ForumPost.deleteMany({ parentPost: post._id });

    await post.remove();

    res.json({ message: 'Forum post and its replies deleted successfully' });
  })
);

module.exports = router;
