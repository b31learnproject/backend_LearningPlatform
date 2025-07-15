// backend/controllers/assignmentController.js
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');

// ✅ Controller for learners to view assignments (filtered by enrollment)
exports.getAssignmentsForLearner = async (req, res) => {
  try {
    console.log('🔍 DEBUG: getAssignmentsForLearner controller called');
    const learnerId = req.user._id;
    const { courseId } = req.query;

    console.log('🔍 DEBUG: Learner ID:', learnerId);
    console.log('🔍 DEBUG: Course ID filter:', courseId);

    // Get learner's enrolled courses with active enrollment and successful payment
    const enrollments = await Enrollment.find({
      learner: learnerId,
      status: 'active',
      paymentStatus: 'success'
    }).select('course');
    
    const enrolledCourseIds = enrollments.map(e => e.course);
    console.log('🔍 DEBUG: Enrolled course IDs:', enrolledCourseIds);

    // Build filter for assignments
    const filter = {
      course: { $in: enrolledCourseIds }
    };
    
    // If specific course requested, further filter
    if (courseId) {
      filter.course = courseId;
    }

    console.log('🔍 DEBUG: Assignment filter:', filter);

    const assignments = await Assignment.find(filter)
      .populate('course', 'title')
      .populate('educator', 'firstName lastName email')
      .sort({ dueDate: 1 });

    console.log('🔍 DEBUG: Found assignments count:', assignments.length);
    
    res.status(200).json(assignments);
  } catch (err) {
    console.error('❌ Error fetching learner assignments:', err.message);
    res.status(500).json({ message: 'Failed to fetch assignments', error: err.message });
  }
};
