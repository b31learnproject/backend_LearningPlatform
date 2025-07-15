const asyncHandler = require('express-async-handler');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const path = require('path');
const { generateReceiptPDF } = require('../utils/reportUtils');

// ... [Other existing functions remain unchanged] ...

// ✅ Get learners with their enrolled courses (Enhanced)
exports.getLearnersWithEnrollments = asyncHandler(async (req, res) => {
  const role = req.user.role;
  if (role !== 'coordinator') {
    res.status(403);
    throw new Error('Only coordinators can access this data');
  }

  const enrollments = await Enrollment.find()
    .populate('learner', 'firstName lastName email phone country')
    .populate('course', 'title startDate category');

  const grouped = {};
  enrollments.forEach(enr => {
    const learnerId = enr.learner._id.toString();
    if (!grouped[learnerId]) {
      grouped[learnerId] = {
        ...enr.learner.toObject(),
        enrolledCourses: [],
      };
    }

    grouped[learnerId].enrolledCourses.push({
      _id: enr.course._id,
      title: enr.course.title,
      enrolledAt: enr.enrollmentDate,
      enrollmentId: enr._id, // ✅ Added: Used for unenrolling
    });
  });

  res.json(Object.values(grouped));
});

// ✅ New: Unenroll learner using enrollmentId
exports.unenrollLearnerFromCourseByEnrollmentId = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const enrollment = await Enrollment.findById(id);
  if (!enrollment) {
    res.status(404);
    throw new Error('Enrollment not found');
  }

  await enrollment.remove();
  res.json({ message: 'Learner unenrolled successfully' });
});
