const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
/*const {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getMyCourses,
  getCoursesByEducator,
  getCoursesWithStudentsAndMarks,
  getCoursesWithStudentNames,
  getCourseStatistics,
  getCourseById,
  getCoursesWithStudents,
} = require('../controllers/courseController');*/
 const courseController = require('../controllers/courseController');


const { protect, authorizeRoles } = require('../middleware/auth');


const uploadCourseImage = require('../middleware/uploadCourseImage');

// ✅ Educator: Get their assigned courses using controller
router.get(
  '/educator',
  protect,
  authorizeRoles('educator'),
  courseController.getCoursesByEducator
);

// ✅ Educator: Get their assigned courses using controller
router.get(
  '/my',
  protect,
  authorizeRoles('educator'),
  courseController.getMyCourses
);

// ✅ Publicly accessible routes
router.get('/', courseController.getCourses); // Public course list
router.get('/:id', courseController.getCourseById); // Public course details

// ✅ Upload course image (used in CourseForm.js)
router.post(
  '/upload-course-image',
  protect,
  authorizeRoles('coordinator'),
  uploadCourseImage.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const imageUrl = `/uploads/courseImages/${req.file.filename}`;
    console.log('Course image uploaded:', imageUrl); // Debug log
    res.status(200).json({ imageUrl });
  }
);

// ✅ Protected: Coordinator/Admin only
router.get(
  '/with-students',
  protect,
  authorizeRoles('coordinator'),
  courseController.getCoursesWithStudentsAndMarks
);

router.get(
  '/with-students-simple',
  protect,
  authorizeRoles('coordinator'),
  courseController.getCoursesWithStudents
);

// ✅ Educator: Get their assigned courses
/*router.get(
  '/my',
  protect,
  authorizeRoles('educator'),
  async (req, res) => {
    try {
      const educatorId = req.user._id;
      const courses = await Course.find({ educator: educatorId }).populate('educator', 'firstName lastName email');
      res.json(courses);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to load educator courses' });
    }
  }
);*/

// ✅ Create new course (coordinator only)
router.post(
  '/',
  protect,
  authorizeRoles('coordinator'),
  uploadCourseImage.single('image'),
  courseController.createCourse
);

// ✅ Update a course (coordinator only)
router.patch(
  '/:id',
  protect,
  authorizeRoles('coordinator'),
  uploadCourseImage.single('image'),
  courseController.updateCourse
);



// ✅ Allow coordinator to fetch course + student + quiz data
router.get(
  '/with-students-and-marks',
  protect,
  authorizeRoles('coordinator'),
  courseController.getCoursesWithStudentsAndMarks
);


// ✅ Delete a course (coordinator only)
router.delete('/:id', protect, authorizeRoles('coordinator'), courseController.deleteCourse);

// ✅ Debug endpoint to check educator info
router.get(
  '/debug/educator-info',
  protect,
  authorizeRoles('educator'),
  (req, res) => {
    console.log('Debug endpoint called by user:', req.user);
    res.json({
      user: req.user,
      userId: req.user._id,
      userRole: req.user.role,
      message: 'Educator info retrieved successfully'
    });
  }
);

module.exports = router;
