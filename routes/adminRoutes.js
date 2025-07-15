const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const {
  getPendingApprovals,
  approveUser,
  disapproveUser,
  removeApproval,
  getAllCoordinatorsAndEducators,
  deleteUser,
  getAdminStats,
} = require('../controllers/adminController');

// @route   GET /api/v1/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private/Admin
router.get('/stats', protect, authorizeRoles('admin'), getAdminStats);

// @route   GET /api/v1/admin/pending-approvals
// @desc    Get all pending approval requests
// @access  Private/Admin
router.get('/pending-approvals', protect, authorizeRoles('admin'), getPendingApprovals);

// @route   GET /api/v1/admin/users
// @desc    Get all coordinators and educators with their approval status
// @access  Private/Admin
router.get('/users', protect, authorizeRoles('admin'), getAllCoordinatorsAndEducators);

// @route   PUT /api/v1/admin/approve/:id
// @desc    Approve a coordinator or educator
// @access  Private/Admin
router.put('/approve/:id', protect, authorizeRoles('admin'), approveUser);

// @route   PUT /api/v1/admin/disapprove/:id
// @desc    Disapprove/Reject a coordinator or educator
// @access  Private/Admin
router.put('/disapprove/:id', protect, authorizeRoles('admin'), disapproveUser);

// @route   PUT /api/v1/admin/remove-approval/:id
// @desc    Remove approval from a coordinator or educator (set to pending)
// @access  Private/Admin
router.put('/remove-approval/:id', protect, authorizeRoles('admin'), removeApproval);

// @route   DELETE /api/v1/admin/users/:id
// @desc    Delete a coordinator or educator (remove from system)
// @access  Private/Admin
router.delete('/users/:id', protect, authorizeRoles('admin'), deleteUser);

module.exports = router; 