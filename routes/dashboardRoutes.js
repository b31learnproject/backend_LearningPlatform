const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Submission = require('../models/Submission');

const { protect, authorizeRoles } = require('../middleware/auth');
const { getEducatorDashboard } = require('../controllers/dashboardController');

// @route   GET /api/v1/dashboard/metrics
// @desc    Get dashboard summary metrics for coordinator or educator
// @access  Private (coordinator, educator)
router.get(
  '/metrics',
  protect,
  authorizeRoles('coordinator', 'educator'),
  asyncHandler(async (req, res) => {
    const { role, _id: userId } = req.user;

    let metrics = {
      coursesCount: 0,
      assignmentsCount: 0,
      submissionsCount: 0,
      educatorsCount: 0,
      learnersCount: 0,
      enrollmentsCount: 0,
    };

    if (role === 'coordinator') {
      metrics.coursesCount = await Course.countDocuments();
      metrics.assignmentsCount = await Assignment.countDocuments();
      metrics.educatorsCount = await User.countDocuments({ role: 'educator' });
      metrics.learnersCount = await User.countDocuments({ role: 'learner' });
      metrics.enrollmentsCount = await Enrollment.countDocuments();
      metrics.submissionsCount = await Submission.countDocuments();
    } else if (role === 'educator') {
      const educatorCourses = await Course.find({ educator: userId }).select('_id');
      const courseIds = educatorCourses.map(c => c._id);

      const educatorAssignments = await Assignment.find({ course: { $in: courseIds } }).select('_id');
      const assignmentIds = educatorAssignments.map(a => a._id);

      metrics.coursesCount = courseIds.length;
      metrics.assignmentsCount = assignmentIds.length;
      metrics.submissionsCount = await Submission.countDocuments({ assignment: { $in: assignmentIds } });
    }

    res.status(200).json(metrics);
  })
);

// ✅ NEW ROUTE: Educator-only dashboard
// @route   GET /api/v1/dashboard/educator
// @desc    Get educator-specific dashboard stats
// @access  Private (educator)
router.get(
  '/educator',
  protect,
  authorizeRoles('educator'),
  getEducatorDashboard
);

module.exports = router;
