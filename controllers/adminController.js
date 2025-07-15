const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc    Get all pending approval requests
// @route   GET /api/v1/admin/pending-approvals
// @access  Private/Admin
exports.getPendingApprovals = asyncHandler(async (req, res) => {
  const pendingUsers = await User.find({
    role: { $in: ['coordinator', 'educator'] },
    isApproved: false,
  }).select('-password').sort({ createdAt: -1 });

  res.json(pendingUsers);
});

// @desc    Approve a coordinator or educator
// @route   PUT /api/v1/admin/approve/:id
// @access  Private/Admin
exports.approveUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role !== 'coordinator' && user.role !== 'educator') {
    res.status(400);
    throw new Error('Only coordinators and educators require approval');
  }

  user.isApproved = true;
  await user.save();

  res.json({
    message: `${user.role} ${user.firstName} ${user.lastName} has been approved`,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
    },
  });
});

// @desc    Disapprove/Reject a coordinator or educator
// @route   PUT /api/v1/admin/disapprove/:id
// @access  Private/Admin
exports.disapproveUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role !== 'coordinator' && user.role !== 'educator') {
    res.status(400);
    throw new Error('Only coordinators and educators require approval');
  }

  user.isApproved = false;
  await user.save();

  res.json({
    message: `${user.role} ${user.firstName} ${user.lastName} has been disapproved`,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
    },
  });
});

// @desc    Remove approval from a coordinator or educator (set to pending)
// @route   PUT /api/v1/admin/remove-approval/:id
// @access  Private/Admin
exports.removeApproval = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role !== 'coordinator' && user.role !== 'educator') {
    res.status(400);
    throw new Error('Only coordinators and educators require approval');
  }

  if (!user.isApproved) {
    res.status(400);
    throw new Error('User is not currently approved');
  }

  user.isApproved = false;
  await user.save();

  res.json({
    message: `Approval removed from ${user.role} ${user.firstName} ${user.lastName}. They are now pending approval again.`,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
    },
  });
});

// @desc    Get all coordinators and educators with their approval status
// @route   GET /api/v1/admin/users
// @access  Private/Admin
exports.getAllCoordinatorsAndEducators = asyncHandler(async (req, res) => {
  const users = await User.find({
    role: { $in: ['coordinator', 'educator'] },
  }).select('-password').sort({ createdAt: -1 });

  res.json(users);
});

// @desc    Delete a coordinator or educator (remove from system)
// @route   DELETE /api/v1/admin/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role === 'admin') {
    res.status(400);
    throw new Error('Cannot delete admin users');
  }

  await user.deleteOne();

  res.json({
    message: `${user.role} ${user.firstName} ${user.lastName} has been deleted from the system`,
  });
});

// @desc    Get admin dashboard statistics
// @route   GET /api/v1/admin/stats
// @access  Private/Admin
exports.getAdminStats = asyncHandler(async (req, res) => {
  const totalCoordinators = await User.countDocuments({ role: 'coordinator' });
  const totalEducators = await User.countDocuments({ role: 'educator' });
  const totalLearners = await User.countDocuments({ role: 'learner' });
  
  const approvedCoordinators = await User.countDocuments({ 
    role: 'coordinator', 
    isApproved: true 
  });
  const approvedEducators = await User.countDocuments({ 
    role: 'educator', 
    isApproved: true 
  });
  
  const pendingCoordinators = await User.countDocuments({ 
    role: 'coordinator', 
    isApproved: false 
  });
  const pendingEducators = await User.countDocuments({ 
    role: 'educator', 
    isApproved: false 
  });

  res.json({
    totalUsers: {
      coordinators: totalCoordinators,
      educators: totalEducators,
      learners: totalLearners,
      total: totalCoordinators + totalEducators + totalLearners,
    },
    approvals: {
      approvedCoordinators,
      approvedEducators,
      pendingCoordinators,
      pendingEducators,
      totalPending: pendingCoordinators + pendingEducators,
    },
  });
}); 