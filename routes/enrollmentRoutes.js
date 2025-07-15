const express = require('express');
const router = express.Router();
const {
  enrollInCourse,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
  getMyEnrollmentHistory,
  generateReceiptPDF,
  getLearnersWithEnrollments // ✅ added controller
} = require('../controllers/enrollmentController');

const asyncHandler = require('express-async-handler');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const { protect, authorizeRoles } = require('../middleware/auth');

// ✅ Enroll a learner
router.post(
  '/',
  protect,
  authorizeRoles('learner'),
  asyncHandler(async (req, res) => {
    const learnerId = req.user._id;
    const { course } = req.body;

    if (!course) {
      res.status(400);
      throw new Error('Course ID is required');
    }

    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      res.status(404);
      throw new Error('Course not found');
    }

    const existingEnrollment = await Enrollment.findOne({ learner: learnerId, course });
    if (existingEnrollment) {
      res.status(400);
      throw new Error('You are already enrolled in this course');
    }

    const enrollment = await Enrollment.create({
      learner: learnerId,
      course,
      status: 'active',
      enrollmentDate: new Date(),
      progressPercentage: 0,
      paymentStatus: 'pending', // Require payment for enrollment
    });

    res.status(201).json(enrollment);
  })
);

// ✅ Get all enrollments
router.get(
  '/',
  protect,
  authorizeRoles('coordinator', 'educator', 'learner'),
  asyncHandler(async (req, res) => {
    let filter = {};
    const role = req.user.role;
    const userId = req.user._id;

    if (role === 'learner') {
      filter.learner = userId;
    } else if (role === 'educator') {
      const courses = await Course.find({ educator: userId }).select('_id');
      filter.course = { $in: courses.map((c) => c._id) };
    }

    const enrollments = await Enrollment.find(filter)
      .populate('learner', 'firstName lastName email')
      .populate('course', 'title category venue medium duration startDate endDate')
      .sort({ enrollmentDate: -1 });

    res.json(enrollments);
  })
);

// ✅ Get learners with their enrolled courses (NEW)
router.get(
  '/by-learner', // ✅ NEW ROUTE
  protect,
  authorizeRoles('coordinator'),
  getLearnersWithEnrollments
);

// ✅ Get enrollment by ID
router.get(
  '/:id',
  protect,
  authorizeRoles('coordinator', 'educator', 'learner'),
  asyncHandler(async (req, res) => {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('learner', 'firstName lastName email')
      .populate('course', 'title category educator');

    if (!enrollment) {
      res.status(404);
      throw new Error('Enrollment not found');
    }

    const userId = req.user._id.toString();
    const role = req.user.role;
    const isEducatorOfCourse =
      enrollment.course.educator && enrollment.course.educator.toString() === userId;

    if (
      role === 'learner' &&
      enrollment.learner._id.toString() !== userId &&
      !isEducatorOfCourse &&
      role !== 'coordinator'
    ) {
      res.status(403);
      throw new Error('Not authorized to view this enrollment');
    }

    res.json(enrollment);
  })
);

// ✅ Update enrollment
router.patch(
  '/:id',
  protect,
  authorizeRoles('learner', 'coordinator'),
  asyncHandler(async (req, res) => {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      res.status(404);
      throw new Error('Enrollment not found');
    }

    if (
      req.user.role === 'learner' &&
      enrollment.learner.toString() !== req.user._id.toString()
    ) {
      res.status(403);
      throw new Error('Not authorized to update this enrollment');
    }

    const { status, progressPercentage, paymentStatus } = req.body;

    if (status !== undefined) enrollment.status = status;
    if (progressPercentage !== undefined) {
      if (progressPercentage < 0 || progressPercentage > 100) {
        res.status(400);
        throw new Error('Progress percentage must be between 0 and 100');
      }
      enrollment.progressPercentage = progressPercentage;
    }
    if (paymentStatus !== undefined) {
      enrollment.paymentStatus = paymentStatus;
    }

    const updated = await enrollment.save();
    res.json(updated);
  })
);

// ✅ Delete enrollment
// ✅ Process payment for enrollment
router.post(
  '/:id/payment',
  protect,
  authorizeRoles('learner'),
  asyncHandler(async (req, res) => {
    const Payment = require('../models/Payment');
    const enrollment = await Enrollment.findById(req.params.id).populate('course learner');

    if (!enrollment) {
      res.status(404);
      throw new Error('Enrollment not found');
    }

    if (enrollment.learner._id.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to process payment for this enrollment');
    }

    if (enrollment.paymentStatus === 'success') {
      res.status(400);
      throw new Error('Payment has already been completed for this enrollment');
    }

    const { transactionId, paymentMethod, gatewayResponse, orderId } = req.body;

    // Create payment record
    const payment = await Payment.create({
      enrollment: enrollment._id,
      learner: enrollment.learner._id,
      course: enrollment.course._id,
      transactionId: transactionId || `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: orderId || `ORDER_${Date.now()}`,
      amount: enrollment.course.fee || 0,
      currency: 'INR',
      paymentMethod: paymentMethod || 'card',
      paymentProvider: 'gateway',
      status: 'success',
      gatewayResponse: gatewayResponse || {},
      paymentDetails: {
        cardLast4: gatewayResponse?.cardLast4,
        cardType: gatewayResponse?.cardType,
        upiId: gatewayResponse?.upiId,
      },
      paymentDate: new Date(),
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID || 'unknown'
      }
    });

    // Update enrollment payment status
    enrollment.paymentStatus = 'success';
    await enrollment.save();

    // Populate payment for response
    await payment.populate([
      { path: 'course', select: 'title category fee' },
      { path: 'learner', select: 'firstName lastName email' }
    ]);

    res.json({
      message: 'Payment processed successfully',
      payment: payment.getSummary(),
      enrollment: {
        _id: enrollment._id,
        paymentStatus: enrollment.paymentStatus,
        course: enrollment.course,
        learner: enrollment.learner
      }
    });
  })
);

// ✅ Delete enrollment (unenroll)
router.delete(
  '/:id',
  protect,
  authorizeRoles('learner', 'coordinator'),
  asyncHandler(async (req, res) => {
    const enrollment = await Enrollment.findById(req.params.id).populate('course');

    if (!enrollment) {
      res.status(404);
      throw new Error('Enrollment not found');
    }

    const userId = req.user._id.toString();

    if (req.user.role === 'learner') {
      if (enrollment.learner.toString() !== userId) {
        res.status(403);
        throw new Error('Not authorized to delete this enrollment');
      }

      const courseStartDate = new Date(enrollment.course.startDate);
      const today = new Date();
      const diffDays = (today - courseStartDate) / (1000 * 60 * 60 * 24);

      if (diffDays > 7 || diffDays < 0) {
        res.status(403);
        throw new Error('Unenrollment period expired. You can only unenroll within 7 days after the course starts.');
      }
    }

    await enrollment.deleteOne();
    res.json({ message: 'Enrollment deleted successfully' });
  })
);

module.exports = router;
