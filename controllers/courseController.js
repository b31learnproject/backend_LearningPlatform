const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const courseController = require('../controllers/courseController');



// GET all courses with filtering
exports.getCourses = asyncHandler(async (req, res) => {
  // Build filter object from query parameters
  const filter = {};
  
  if (req.query.category) {
    filter.category = req.query.category;
  }
  
  if (req.query.medium) {
    filter.medium = req.query.medium;
  }
  
  if (req.query.venue) {
    filter.venue = req.query.venue;
  }
  
  // Add date filtering if needed
  if (req.query.startDate || req.query.endDate) {
    filter.startDate = {};
    if (req.query.startDate) {
      filter.startDate.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filter.startDate.$lte = new Date(req.query.endDate);
    }
  }
  
  console.log('Applied filters:', filter); // Debug log
  
  const courses = await Course.find(filter).populate('educator', 'firstName lastName');
  
  // Map image field to imageUrl for frontend compatibility
  const coursesWithImageUrl = courses.map(course => {
    const courseObj = course.toObject();
    courseObj.imageUrl = courseObj.image; // Map image to imageUrl
    delete courseObj.image; // Remove the original image field
    return courseObj;
  });
  
  console.log(`Found ${coursesWithImageUrl.length} courses with filters`); // Debug log
  
  res.json(coursesWithImageUrl);
});

// GET course by ID
exports.getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id).populate('educator', 'firstName lastName');
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }
  
  // Map image field to imageUrl for frontend compatibility
  const courseObj = course.toObject();
  courseObj.imageUrl = courseObj.image;
  delete courseObj.image;
  
  res.json(courseObj);
});

// CREATE course (with image)
exports.createCourse = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    syllabus,
    duration,
    startDate,
    endDate,
    fee,
    educator,
    medium,
    venue,
    classTimes,
    image, // This comes from frontend when using separate upload
  } = req.body;

  // Handle image upload - prioritize file upload, then URL from body
  let imagePath = null;
  if (req.file) {
    // Direct file upload with form
    imagePath = `/uploads/courseImages/${req.file.filename}`;
  } else if (image) {
    // Image URL from separate upload endpoint
    imagePath = image;
  }

  const newCourse = new Course({
    title,
    description,
    category,
    syllabus,
    duration,
    startDate,
    endDate,
    fee,
    educator,
    medium,
    venue,
    classTimes,
    image: imagePath, // Store the accessible URL path
  });

  const saved = await newCourse.save();
  
  // Map image field to imageUrl for frontend compatibility
  const courseObj = saved.toObject();
  courseObj.imageUrl = courseObj.image;
  delete courseObj.image;
  
  res.status(201).json(courseObj);
});

// UPDATE course (with image)
exports.updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  const {
    title,
    description,
    category,
    syllabus,
    duration,
    startDate,
    endDate,
    fee,
    educator,
    medium,
    venue,
    classTimes,
    image, // This comes from frontend when using separate upload
  } = req.body;

  // Handle image upload - prioritize file upload, then URL from body, then keep existing
  let imagePath = course.image; // Keep existing image by default
  if (req.file) {
    // New file uploaded directly with form
    imagePath = `/uploads/courseImages/${req.file.filename}`;
  } else if (image && image !== course.image) {
    // New image URL from separate upload endpoint
    imagePath = image;
  }

  course.title = title || course.title;
  course.description = description || course.description;
  course.category = category || course.category;
  course.syllabus = syllabus || course.syllabus;
  course.duration = duration || course.duration;
  course.startDate = startDate || course.startDate;
  course.endDate = endDate || course.endDate;
  course.fee = fee || course.fee;
  course.educator = educator || course.educator;
  course.medium = medium || course.medium;
  course.venue = venue || course.venue;
  course.classTimes = classTimes || course.classTimes;
  course.image = imagePath; // Set the image path (new or existing)

  const updated = await course.save();
  
  // Map image field to imageUrl for frontend compatibility
  const courseObj = updated.toObject();
  courseObj.imageUrl = courseObj.image;
  delete courseObj.image;
  
  res.json(courseObj);
});

// DELETE course
exports.deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  try {
    // Start a transaction to ensure data consistency
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      // Delete all related data in the correct order
      
      // 1. Delete quiz attempts first (they depend on quizzes)
      const QuizAttempt = require('../models/QuizAttempt');
      const quizzes = await require('../models/Quiz').find({ course: req.params.id });
      const quizIds = quizzes.map(quiz => quiz._id);
      if (quizIds.length > 0) {
        await QuizAttempt.deleteMany({ quiz: { $in: quizIds } }, { session });
      }

      // 2. Delete submissions (they depend on assignments)
      const Submission = require('../models/Submission');
      await Submission.deleteMany({ course: req.params.id }, { session });

      // 3. Delete assignments
      const Assignment = require('../models/Assignment');
      await Assignment.deleteMany({ course: req.params.id }, { session });

      // 4. Delete quizzes
      const Quiz = require('../models/Quiz');
      await Quiz.deleteMany({ course: req.params.id }, { session });

      // 5. Delete evaluations
      const Evaluation = require('../models/Evaluation');
      await Evaluation.deleteMany({ course: req.params.id }, { session });

      // 6. Delete study plans
      const StudyPlan = require('../models/StudyPlan');
      await StudyPlan.deleteMany({ course: req.params.id }, { session });

      // 7. Delete forum posts
      const ForumPost = require('../models/ForumPost');
      await ForumPost.deleteMany({ course: req.params.id }, { session });

      // 8. Delete doubt sessions
      const DoubtSession = require('../models/DoubtSession');
      await DoubtSession.deleteMany({ course: req.params.id }, { session });

      // 9. Delete payments
      const Payment = require('../models/Payment');
      await Payment.deleteMany({ course: req.params.id }, { session });

      // 10. Delete enrollments
      await Enrollment.deleteMany({ course: req.params.id }, { session });

      // 11. Finally, delete the course itself
      await Course.findByIdAndDelete(req.params.id, { session });
    });

    await session.endSession();
    
    res.json({ message: 'Course and all related data removed successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500);
    throw new Error('Failed to delete course. Please try again.');
  }
});

// GET courses with learners and marks
exports.getCoursesWithStudentsAndMarks = asyncHandler(async (req, res) => {
  try {
    const { educator, title, category, startDate, endDate } = req.query;

    const match = {};
    if (educator && mongoose.Types.ObjectId.isValid(educator)) {
      match.educator = new mongoose.Types.ObjectId(educator);
    }
    if (title && title.trim() !== '') {
      match.title = { $regex: title.trim(), $options: 'i' };
    }
    if (category && category.trim() !== '') {
      match.category = { $regex: category.trim(), $options: 'i' };
    }
    if (startDate || endDate) {
      match.startDate = {};
      if (startDate) match.startDate.$gte = new Date(startDate);
      if (endDate) match.startDate.$lte = new Date(endDate);
    }

    const courses = await Course.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'educators',
          localField: 'educator',
          foreignField: '_id',
          as: 'educatorDetails'
        }
      },
      { $unwind: { path: '$educatorDetails', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'enrollments',
          localField: '_id',
          foreignField: 'course',
          as: 'enrollments'
        }
      },
      { $unwind: { path: '$enrollments', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'enrollments.learner',
          foreignField: '_id',
          as: 'learnerInfo'
        }
      },
      { $unwind: { path: '$learnerInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'submissions',
          let: { courseId: '$_id', learnerId: '$learnerInfo._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$course', '$$courseId'] },
                    { $eq: ['$learner', '$$learnerId'] }
                  ]
                }
              }
            },
            { $group: { _id: null, avgMark: { $avg: '$mark' } } }
          ],
          as: 'assignmentMarks'
        }
      },
      {
        $lookup: {
          from: 'quizzes',
          let: { courseId: '$_id', learnerId: '$learnerInfo._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$course', '$$courseId'] },
                    { $eq: ['$learner', '$$learnerId'] }
                  ]
                }
              }
            },
            { $group: { _id: null, avgMark: { $avg: '$mark' } } }
          ],
          as: 'quizMarks'
        }
      },
      {
        $addFields: {
          student: {
            name: {
              $cond: [
                {
                  $and: [
                    { $ifNull: ['$learnerInfo.firstName', false] },
                    { $ifNull: ['$learnerInfo.lastName', false] }
                  ]
                },
                {
                  $concat: ['$learnerInfo.firstName', ' ', '$learnerInfo.lastName']
                },
                'Unknown Learner'
              ]
            },
            assignmentMark: {
              $round: [{ $ifNull: [{ $arrayElemAt: ['$assignmentMarks.avgMark', 0] }, 0] }, 2]
            },
            quizMark: {
              $round: [{ $ifNull: [{ $arrayElemAt: ['$quizMarks.avgMark', 0] }, 0] }, 2]
            }
          }
        }
      },
      {
        $group: {
          _id: '$_id',
          title: { $first: '$title' },
          category: { $first: '$category' },
          venue: { $first: '$venue' },
          medium: { $first: '$medium' },
          startDate: { $first: '$startDate' },
          endDate: { $first: '$endDate' },
          educator: {
            $first: {
              $cond: [
                { $ifNull: ['$educatorDetails.firstName', false] },
                '$educatorDetails.firstName',
                'N/A'
              ]
            }
          },
          students: {
            $push: {
              name: '$student.name',
              assignmentMark: '$student.assignmentMark',
              quizMark: '$student.quizMark'
            }
          }
        }
      },
      { $sort: { startDate: -1 } }
    ]);

    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses with learners and marks:', error.message);
    res.status(500).json({ message: 'Server error occurred while fetching learner data.' });
  }
});

// GET courses with enrolled learners (simple version)
exports.getCoursesWithStudents = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find()
    .populate('learner', 'firstName lastName email')
    .populate('course', 'title category');

  const grouped = {};
  enrollments.forEach(enr => {
    const courseId = enr.course._id.toString();
    if (!grouped[courseId]) {
      grouped[courseId] = {
        _id: enr.course._id,
        title: enr.course.title,
        category: enr.course.category,
        learners: [],
      };
    }

    grouped[courseId].learners.push({
      _id: enr.learner._id,
      firstName: enr.learner.firstName,
      lastName: enr.learner.lastName,
      email: enr.learner.email,
    });
  });

  res.json(Object.values(grouped));
});

// GET courses with basic enrolled learners info for coordinator dashboard
exports.getCoursesWithStudents = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find()
    .populate('learner', 'firstName lastName email')
    .populate('course');

  const grouped = {};

  enrollments.forEach(enr => {
    const course = enr.course;
    const courseId = course._id.toString();

    if (!grouped[courseId]) {
      grouped[courseId] = {
        _id: course._id,
        title: course.title,
        category: course.category,
        duration: course.duration,
        fee: course.fee,
        medium: course.medium,
        venue: course.venue,
        startDate: course.startDate,
        endDate: course.endDate,
        educator: course.educator,
        learners: [],
        totalLearners: 0
      };
    }

    grouped[courseId].learners.push({
      _id: enr.learner._id,
      firstName: enr.learner.firstName,
      lastName: enr.learner.lastName,
      email: enr.learner.email,
    });

    grouped[courseId].totalLearners += 1;
  });

  res.json(Object.values(grouped));
});

// @desc    Fetch course names with enrolled student names (simplified for dashboard)
// @route   GET /api/v1/courses/with-students-simple
// @access  Coordinator
exports.getCoursesWithStudentNames = asyncHandler(async (req, res) => {
  const courses = await Course.find({})
    .select('title')
    .populate({
      path: 'enrollments',
      select: 'learner',
      populate: { path: 'learner', select: 'firstName lastName email' }
    });

  const result = courses.map(course => ({
    courseTitle: course.title,
    students: course.enrollments.map(e => e.learner),
  }));

  res.json(result);
});

// GET courses for logged-in educator
exports.getMyCourses = asyncHandler(async (req, res) => {
  try {
    console.log('--- getMyCourses called ---');
    console.log('req.user:', req.user);
    console.log('req.user.role:', req.user?.role);
    console.log('req.user._id:', req.user?._id);
    
    const educatorId = req.user._id.toString();
    console.log('EducatorId for query:', educatorId);

    if (!educatorId) {
      console.log('Educator ID missing, sending 400');
      res.status(400);
      throw new Error('Educator ID missing from request');
    }

    // Log query before executing
    console.log('Executing query: Course.find({ educator:', educatorId, '})');
    
    const courses = await Course.find({ educator: educatorId })
      .populate('educator', 'firstName lastName email')
      .sort({ createdAt: -1 }); // Sort by newest first
      
    console.log('Raw courses from DB:', courses);
    console.log('Courses found count:', courses.length);
    
    if (courses.length > 0) {
      console.log('Sample course:', {
        id: courses[0]._id,
        title: courses[0].title,
        educator: courses[0].educator
      });
    }

    // Map image field to imageUrl for frontend compatibility
    const coursesWithImageUrl = courses.map(course => {
      const courseObj = course.toObject();
      courseObj.imageUrl = courseObj.image;
      delete courseObj.image;
      return courseObj;
    });

    console.log('Final response data:', { courses: coursesWithImageUrl });

    // Return in consistent format with getCoursesByEducator
    res.json({ courses: coursesWithImageUrl });
  } catch (err) {
    console.error('Error in getMyCourses:', err);
    throw err; // Let asyncHandler handle the error as usual
  }
});



exports.getCoursesByEducator = asyncHandler(async (req, res) => {
  console.log('getCoursesByEducator req.user:', req.user);
  const educatorId = req.user?._id;
  if (!educatorId) {
    console.log('Educator ID missing in getCoursesByEducator');
    return res.status(400).json({ message: 'Educator ID missing from request' });
  }
  const courses = await Course.find({ educator: educatorId }).populate('educator');
  
  // Map image field to imageUrl for frontend compatibility
  const coursesWithImageUrl = courses.map(course => {
    const courseObj = course.toObject();
    courseObj.imageUrl = courseObj.image;
    delete courseObj.image;
    return courseObj;
  });
  
  res.status(200).json({ courses: coursesWithImageUrl });
});

