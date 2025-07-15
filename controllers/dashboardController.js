const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');
const asyncHandler = require('express-async-handler');


exports.getEducatorDashboardMetrics = async (req, res) => {
  try {
    const educatorId = req.user._id;

    const coursesCount = await Course.countDocuments({ educator: educatorId });
    const assignments = await Assignment.find({ educator: educatorId }).select('_id');
    const assignmentIds = assignments.map(a => a._id);

    const assignmentsCount = assignmentIds.length;

    const submissions = await Submission.find({ assignment: { $in: assignmentIds } });
    const submissionsCount = submissions.length;

    const gradedSubmissions = submissions.filter(s => s.grade !== undefined && s.grade !== null);
    const gradedCount = gradedSubmissions.length;

    const averageGrade =
      gradedCount > 0
        ? gradedSubmissions.reduce((sum, s) => sum + parseFloat(s.grade), 0) / gradedCount
        : 0;

    res.status(200).json({
      coursesCount,
      assignmentsCount,
      submissionsCount,
      gradedCount,
      averageGrade: averageGrade.toFixed(2),
    });
  } catch (error) {
    console.error("Educator metrics fetch error:", error.message);
    res.status(500).json({ message: 'Failed to fetch educator dashboard metrics' });
  }
};

// @desc Get educator dashboard metrics
// @route GET /api/v1/dashboard/educator
// @access Private/Educator
exports.getEducatorDashboard = asyncHandler(async (req, res) => {
  const educatorId = req.user._id; // From token

  const totalCourses = await Course.countDocuments({ educator: educatorId });
  const totalAssignments = await Assignment.countDocuments({ educator: educatorId });
  const totalQuizzes = await Quiz.countDocuments({ educator: educatorId });

  res.status(200).json({
    totalCourses,
    totalAssignments,
    totalQuizzes,
  });
});
