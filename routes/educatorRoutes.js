// backend/routes/educatorRoutes.js
const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { protect, authorizeRoles } = require('../middleware/auth');
const {
  getAllEducators,
  deleteEducator,
  toggleEducatorStatus,
} = require('../controllers/educatorController');

/**
 * @route   GET /api/v1/educators
 * @desc    Get all educators
 * @access  Private (coordinator)
 */
router.get('/', protect, authorizeRoles('coordinator'), getAllEducators);

/**
 * @route   DELETE /api/v1/educators/:id
 * @desc    Delete an educator
 * @access  Private (coordinator)
 */
router.delete('/:id', protect, authorizeRoles('coordinator'), deleteEducator);


/**
 * @route   PUT /api/v1/educators/toggle-status/:id
 * @desc    Toggle educator active/inactive status
 * @access  Private (coordinator)
 */
// ✅ ADDED: New route to toggle the active status of an educator.
router.put(
  '/toggle-status/:id',
  protect,
  authorizeRoles('coordinator'),
  toggleEducatorStatus
);

module.exports = router;