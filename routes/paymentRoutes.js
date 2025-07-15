const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const { protect, authorizeRoles } = require('../middleware/auth');

// @route   GET /api/v1/payments/my-history
// @desc    Get payment history for logged-in learner
// @access  Private (learner)
router.get(
  '/my-history',
  protect,
  authorizeRoles('learner'),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, method, dateFrom, dateTo } = req.query;
    
    const filter = { learner: req.user._id };
    
    // Add status filter
    if (status) {
      filter.status = status;
    }
    
    // Add payment method filter
    if (method) {
      filter.paymentMethod = method;
    }
    
    // Add date range filter
    if (dateFrom || dateTo) {
      filter.paymentDate = {};
      if (dateFrom) filter.paymentDate.$gte = new Date(dateFrom);
      if (dateTo) filter.paymentDate.$lte = new Date(dateTo);
    }

    const payments = await Payment.find(filter)
      .populate('course', 'title category fee')
      .populate('enrollment', 'enrollmentDate status')
      .sort({ paymentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalPayments = await Payment.countDocuments(filter);
    const totalPages = Math.ceil(totalPayments / limit);

    // Calculate summary statistics
    const summaryStats = await Payment.aggregate([
      { $match: { learner: req.user._id, status: 'success' } },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          avgTransactionValue: { $avg: '$amount' }
        }
      }
    ]);

    const summary = summaryStats[0] || {
      totalSpent: 0,
      totalTransactions: 0,
      avgTransactionValue: 0
    };

    res.json({
      payments: payments.map(payment => ({
        ...payment.getSummary(),
        enrollment: payment.enrollment,
        fees: payment.fees,
        paymentDetails: payment.paymentDetails
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPayments,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      summary
    });
  })
);

// @route   GET /api/v1/payments/analytics
// @desc    Get payment analytics for coordinators
// @access  Private (coordinator)
router.get(
  '/analytics',
  protect,
  authorizeRoles('coordinator'),
  asyncHandler(async (req, res) => {
    const { dateRange = 30 } = req.query;
    
    // Overall analytics
    const overallAnalytics = await Payment.getAnalytics(parseInt(dateRange));
    
    // Payment method breakdown
    const methodBreakdown = await Payment.aggregate([
      {
        $match: {
          status: 'success',
          paymentDate: { $gte: new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);
    
    // Daily revenue trend
    const dailyTrend = await Payment.aggregate([
      {
        $match: {
          status: 'success',
          paymentDate: { $gte: new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' }
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // Top courses by revenue
    const topCourses = await Payment.aggregate([
      {
        $match: {
          status: 'success',
          paymentDate: { $gte: new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      { $unwind: '$courseInfo' },
      {
        $group: {
          _id: '$course',
          courseName: { $first: '$courseInfo.title' },
          category: { $first: '$courseInfo.category' },
          revenue: { $sum: '$amount' },
          enrollments: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);
    
    // Failed payments analysis
    const failedPayments = await Payment.aggregate([
      {
        $match: {
          status: 'failed',
          paymentDate: { $gte: new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: '$metadata.failureReason',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      overview: overallAnalytics,
      methodBreakdown,
      dailyTrend,
      topCourses,
      failedPayments,
      dateRange: parseInt(dateRange)
    });
  })
);

// @route   GET /api/v1/payments/:id
// @desc    Get payment details by ID
// @access  Private (learner/coordinator)
router.get(
  '/:id',
  protect,
  authorizeRoles('learner', 'coordinator'),
  asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id)
      .populate('course', 'title category fee educator')
      .populate('learner', 'firstName lastName email')
      .populate('enrollment', 'enrollmentDate status progressPercentage');

    if (!payment) {
      res.status(404);
      throw new Error('Payment not found');
    }

    // Check authorization
    if (req.user.role === 'learner' && payment.learner._id.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to view this payment');
    }

    res.json(payment);
  })
);

// @route   POST /api/v1/payments/:id/refund
// @desc    Process refund for a payment
// @access  Private (coordinator)
router.post(
  '/:id/refund',
  protect,
  authorizeRoles('coordinator'),
  asyncHandler(async (req, res) => {
    const { refundAmount, refundReason } = req.body;
    
    const payment = await Payment.findById(req.params.id)
      .populate('enrollment')
      .populate('course', 'title');

    if (!payment) {
      res.status(404);
      throw new Error('Payment not found');
    }

    if (payment.status !== 'success') {
      res.status(400);
      throw new Error('Can only refund successful payments');
    }

    if (payment.refund.isRefunded) {
      res.status(400);
      throw new Error('Payment has already been refunded');
    }

    const refundAmountValue = refundAmount || payment.amount;
    
    if (refundAmountValue > payment.amount) {
      res.status(400);
      throw new Error('Refund amount cannot exceed payment amount');
    }

    // Process refund
    payment.refund = {
      isRefunded: true,
      refundAmount: refundAmountValue,
      refundTransactionId: `REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      refundDate: new Date(),
      refundReason: refundReason || 'Coordinator initiated refund'
    };

    if (refundAmountValue === payment.amount) {
      payment.status = 'refunded';
      
      // Update enrollment status if full refund
      if (payment.enrollment) {
        payment.enrollment.paymentStatus = 'refunded';
        payment.enrollment.status = 'dropped';
        await payment.enrollment.save();
      }
    }

    await payment.save();

    res.json({
      message: 'Refund processed successfully',
      payment: payment.getSummary(),
      refund: payment.refund
    });
  })
);

// @route   GET /api/v1/payments/receipt/:transactionId
// @desc    Generate payment receipt
// @access  Private (learner)
router.get(
  '/receipt/:transactionId',
  protect,
  authorizeRoles('learner', 'coordinator'),
  asyncHandler(async (req, res) => {
    const payment = await Payment.findOne({ transactionId: req.params.transactionId })
      .populate('course', 'title category fee')
      .populate('learner', 'firstName lastName email')
      .populate('enrollment', 'enrollmentDate');

    if (!payment) {
      res.status(404);
      throw new Error('Payment not found');
    }

    // Check authorization for learners
    if (req.user.role === 'learner' && payment.learner._id.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to view this receipt');
    }

    const receipt = {
      receiptId: payment.transactionId,
      paymentDate: payment.paymentDate,
      learner: {
        name: `${payment.learner.firstName} ${payment.learner.lastName}`,
        email: payment.learner.email
      },
      course: {
        title: payment.course.title,
        category: payment.course.category
      },
      payment: {
        amount: payment.amount,
        formattedAmount: payment.formattedAmount,
        currency: payment.currency,
        method: payment.paymentMethod,
        status: payment.status,
        transactionId: payment.transactionId
      },
      enrollment: {
        enrollmentDate: payment.enrollment?.enrollmentDate
      },
      fees: payment.fees,
      organizationInfo: {
        name: 'Learning Dashboard',
        address: 'Learning Platform Education Center',
        contact: 'support@learningdashboard.com'
      }
    };

    res.json(receipt);
  })
);

module.exports = router; 