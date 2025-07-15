const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment reference is required'],
    },
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Learner reference is required'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      unique: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR'],
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['card', 'upi', 'netbanking', 'wallet', 'free'],
    },
    paymentProvider: {
      type: String,
      default: 'gateway',
      enum: ['gateway', 'stripe', 'razorpay', 'paypal', 'paytm'],
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    gatewayResponse: {
      reference: String,
      authCode: String,
      responseCode: String,
      responseMessage: String,
      cardType: String,
      cardLast4: String,
      upiTransactionId: String,
      additionalData: mongoose.Schema.Types.Mixed,
    },
    paymentDetails: {
      cardLast4: String,
      cardType: String,
      upiId: String,
      bankName: String,
      walletProvider: String,
    },
    fees: {
      processingFee: {
        type: Number,
        default: 0,
      },
      gatewayFee: {
        type: Number,
        default: 0,
      },
      taxes: {
        type: Number,
        default: 0,
      },
    },
    refund: {
      isRefunded: {
        type: Boolean,
        default: false,
      },
      refundAmount: {
        type: Number,
        default: 0,
      },
      refundTransactionId: String,
      refundDate: Date,
      refundReason: String,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      },
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      sessionId: String,
      retryCount: {
        type: Number,
        default: 0,
      },
      failureReason: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
paymentSchema.index({ learner: 1, createdAt: -1 });
paymentSchema.index({ enrollment: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ status: 1, paymentDate: -1 });
paymentSchema.index({ course: 1, status: 1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: this.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(this.amount);
});

// Virtual for payment age in days
paymentSchema.virtual('paymentAge').get(function() {
  if (!this.paymentDate) return 0;
  const now = new Date();
  const paymentDate = new Date(this.paymentDate);
  return Math.floor((now - paymentDate) / (1000 * 60 * 60 * 24));
});

// Method to check if payment is expired
paymentSchema.methods.isExpired = function() {
  return this.status === 'pending' && new Date() > this.expiryDate;
};

// Method to get payment summary
paymentSchema.methods.getSummary = function() {
  return {
    transactionId: this.transactionId,
    amount: this.amount,
    formattedAmount: this.formattedAmount,
    currency: this.currency,
    status: this.status,
    paymentMethod: this.paymentMethod,
    paymentDate: this.paymentDate,
    course: this.course?.title || 'N/A',
    learner: `${this.learner?.firstName || ''} ${this.learner?.lastName || ''}`.trim()
  };
};

// Static method to get payment analytics
paymentSchema.statics.getAnalytics = async function(dateRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  const analytics = await this.aggregate([
    {
      $match: {
        paymentDate: { $gte: startDate },
        status: 'success'
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        avgTransactionValue: { $avg: '$amount' },
        paymentMethods: {
          $push: '$paymentMethod'
        }
      }
    },
    {
      $project: {
        totalRevenue: 1,
        totalTransactions: 1,
        avgTransactionValue: { $round: ['$avgTransactionValue', 2] },
        paymentMethodBreakdown: {
          $reduce: {
            input: '$paymentMethods',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $cond: [
                    { $eq: [{ $type: { $getField: { field: '$$this', input: '$$value' } } }, 'missing'] },
                    { $literal: { '$$this': 1 } },
                    { $literal: { '$$this': { $add: [{ $getField: { field: '$$this', input: '$$value' } }, 1] } } }
                  ]
                }
              ]
            }
          }
        }
      }
    }
  ]);

  return analytics[0] || {
    totalRevenue: 0,
    totalTransactions: 0,
    avgTransactionValue: 0,
    paymentMethodBreakdown: {}
  };
};

// Pre-save middleware to update related enrollment
paymentSchema.pre('save', async function(next) {
  if (this.isModified('status') && this.status === 'success') {
    try {
      const Enrollment = mongoose.model('Enrollment');
      await Enrollment.findByIdAndUpdate(
        this.enrollment,
        { paymentStatus: 'success' }
      );
    } catch (error) {
      console.error('Error updating enrollment payment status:', error);
    }
  }
  next();
});

// Post-save middleware for notifications
paymentSchema.post('save', async function(doc) {
  if (doc.status === 'success') {
    // Here you could trigger payment confirmation email
    console.log(`Payment successful for enrollment ${doc.enrollment}: ${doc.transactionId}`);
  } else if (doc.status === 'failed') {
    // Here you could trigger payment failure notification
    console.log(`Payment failed for enrollment ${doc.enrollment}: ${doc.transactionId}`);
  }
});

module.exports = mongoose.model('Payment', paymentSchema); 