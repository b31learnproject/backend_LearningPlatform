// Payment Gateway Configuration
// This file contains all the payment gateway and bank account settings

require('dotenv').config();

// ================================
// COMPANY BANK DETAILS
// ================================
const COMPANY_BANK_DETAILS = {
  companyName: process.env.COMPANY_NAME || 'Your Learning Platform Pvt Ltd',
  bankName: process.env.COMPANY_BANK_NAME || 'State Bank of India',
  accountNumber: process.env.COMPANY_ACCOUNT_NUMBER || '1234567890123456',
  ifscCode: process.env.COMPANY_IFSC_CODE || 'SBIN0001234',
  accountHolderName: process.env.COMPANY_ACCOUNT_HOLDER || 'Your Learning Platform Pvt Ltd',
  branchName: process.env.COMPANY_BRANCH || 'Main Branch, Your City',
  accountType: 'Current Account',
  
  // Tax Information
  panNumber: process.env.COMPANY_PAN || 'ABCDE1234F',
  gstNumber: process.env.COMPANY_GST || '12ABCDE1234F1Z5',
  
  // Business Information
  businessEmail: process.env.BUSINESS_EMAIL || 'payments@yourlearningplatform.com',
  businessPhone: process.env.BUSINESS_PHONE || '+91-9876543210',
  businessAddress: process.env.BUSINESS_ADDRESS || '123 Education Street, Learning City, State - 123456',
  businessWebsite: process.env.BUSINESS_WEBSITE || 'https://yourlearningplatform.com',
};

// ================================
// RAZORPAY CONFIGURATION (Popular in India)
// ================================
const RAZORPAY_CONFIG = {
  keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_your_key_id_here',
  keySecret: process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_secret_here',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret_here',
  
  // Settlement Configuration (Where money will be transferred)
  settlementAccount: {
    accountNumber: COMPANY_BANK_DETAILS.accountNumber,
    ifsc: COMPANY_BANK_DETAILS.ifscCode,
    beneficiaryName: COMPANY_BANK_DETAILS.accountHolderName,
  },
  
  // Auto-settlement settings
  autoSettlement: {
    enabled: true,
    settlementCycle: 'T+1', // Next working day settlement
    minimumAmount: 100, // Minimum ₹100 for settlement
  },
  
  // Payment methods enabled
  paymentMethods: ['card', 'netbanking', 'upi', 'wallet', 'emi'],
  
  // Business details for Razorpay dashboard
  businessDetails: {
    businessName: COMPANY_BANK_DETAILS.companyName,
    businessType: 'education',
    businessModel: 'marketplace',
    expectedMonthlyVolume: 500000, // ₹5 Lakhs per month
  }
};

// ================================
// STRIPE CONFIGURATION (International)
// ================================
const STRIPE_CONFIG = {
  secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key_here',
  publicKey: process.env.STRIPE_PUBLIC_KEY || 'pk_test_your_stripe_public_key_here',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_your_stripe_webhook_secret',
  
  // Connected account for receiving payments
  connectedAccount: {
    accountType: 'standard',
    country: 'IN',
    email: COMPANY_BANK_DETAILS.businessEmail,
    
    // Bank account details
    externalAccount: {
      object: 'bank_account',
      country: 'IN',
      currency: 'inr',
      account_number: COMPANY_BANK_DETAILS.accountNumber,
      routing_number: COMPANY_BANK_DETAILS.ifscCode,
      account_holder_name: COMPANY_BANK_DETAILS.accountHolderName,
      account_holder_type: 'company',
    },
    
    // Business profile
    businessProfile: {
      name: COMPANY_BANK_DETAILS.companyName,
      url: COMPANY_BANK_DETAILS.businessWebsite,
      mcc: '8299', // Educational services
      supportPhone: COMPANY_BANK_DETAILS.businessPhone,
      supportEmail: COMPANY_BANK_DETAILS.businessEmail,
    }
  },
  
  // Payout settings
  payoutSettings: {
    schedule: {
      interval: 'daily', // Daily payouts
      weeklyAnchor: 'monday',
    },
    statementDescriptor: 'LEARNING-PLATFORM',
  }
};

// ================================
// UPI GATEWAY CONFIGURATION
// ================================
const UPI_CONFIG = {
  // For UPI QR Code generation
  upiId: process.env.COMPANY_UPI_ID || 'yourcompany@paytm',
  merchantName: COMPANY_BANK_DETAILS.companyName,
  merchantCode: process.env.UPI_MERCHANT_CODE || 'EDU001',
  
  // UPI Gateway Providers
  payu: {
    merchantKey: process.env.PAYU_MERCHANT_KEY || 'your_payu_merchant_key',
    merchantSalt: process.env.PAYU_MERCHANT_SALT || 'your_payu_salt',
    mode: process.env.NODE_ENV === 'production' ? 'live' : 'test',
  },
  
  cashfree: {
    appId: process.env.CASHFREE_APP_ID || 'your_cashfree_app_id',
    secretKey: process.env.CASHFREE_SECRET_KEY || 'your_cashfree_secret',
    mode: process.env.NODE_ENV === 'production' ? 'PROD' : 'TEST',
  }
};

// ================================
// PAYMENT PROCESSING SETTINGS
// ================================
const PAYMENT_SETTINGS = {
  currency: 'INR',
  currencySymbol: '₹',
  locale: 'en-IN',
  timezone: 'Asia/Kolkata',
  
  // Transaction limits
  limits: {
    minimum: 1, // ₹1
    maximum: 100000, // ₹1 Lakh
    dailyLimit: 500000, // ₹5 Lakhs per day
  },
  
  // Fee configuration
  fees: {
    razorpay: {
      percentage: 2.36, // 2.36% + GST
      fixedFee: 0,
      gst: 18,
    },
    stripe: {
      percentage: 2.9, // 2.9% + ₹2
      fixedFee: 200, // ₹2
      gst: 18,
    },
    upi: {
      percentage: 0.7, // 0.7% for UPI
      fixedFee: 0,
      gst: 18,
    }
  },
  
  // Settlement timing
  settlement: {
    razorpay: 'T+1', // Next working day
    stripe: 'T+2', // 2 working days
    upi: 'T+1', // Next working day
  },
  
  // Webhooks for payment notifications
  webhooks: {
    razorpay: `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/v1/payments/webhooks/razorpay`,
    stripe: `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/v1/payments/webhooks/stripe`,
    upi: `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/v1/payments/webhooks/upi`,
  }
};

// ================================
// COMPLIANCE & SECURITY
// ================================
const COMPLIANCE_CONFIG = {
  pciCompliance: true,
  dataRetention: {
    paymentLogs: 7, // 7 years
    customerData: 3, // 3 years
    auditLogs: 1, // 1 year
  },
  
  encryption: {
    algorithm: 'aes-256-gcm',
    keyRotation: 90, // days
  },
  
  // Required for Indian businesses
  rbi: {
    dataLocalization: true, // Store data in India
    twoFactorAuth: true,
    additionalFactorAuth: false,
  }
};

// ================================
// NOTIFICATION SETTINGS
// ================================
const NOTIFICATION_CONFIG = {
  email: {
    paymentSuccess: true,
    paymentFailure: true,
    refunds: true,
    settlements: true,
  },
  
  sms: {
    enabled: true,
    provider: 'textlocal', // or 'msg91', 'twilio'
    apiKey: process.env.SMS_API_KEY,
    senderId: 'LRNPLT',
  },
  
  whatsapp: {
    enabled: false,
    businessId: process.env.WHATSAPP_BUSINESS_ID,
  }
};

// ================================
// EXPORT CONFIGURATION
// ================================
module.exports = {
  COMPANY_BANK_DETAILS,
  RAZORPAY_CONFIG,
  STRIPE_CONFIG,
  UPI_CONFIG,
  PAYMENT_SETTINGS,
  COMPLIANCE_CONFIG,
  NOTIFICATION_CONFIG,
  
  // Helper function to get active payment gateway config
  getActiveGateway: () => {
    const gateway = process.env.PRIMARY_PAYMENT_GATEWAY || 'razorpay';
    
    switch (gateway) {
      case 'razorpay':
        return RAZORPAY_CONFIG;
      case 'stripe':
        return STRIPE_CONFIG;
      case 'upi':
        return UPI_CONFIG;
      default:
        return RAZORPAY_CONFIG;
    }
  },
  
  // Helper function to validate configuration
  validateConfig: () => {
    const errors = [];
    
    if (!COMPANY_BANK_DETAILS.accountNumber || COMPANY_BANK_DETAILS.accountNumber === '1234567890123456') {
      errors.push('Company bank account number not configured');
    }
    
    if (!COMPANY_BANK_DETAILS.ifscCode || COMPANY_BANK_DETAILS.ifscCode === 'SBIN0001234') {
      errors.push('Company IFSC code not configured');
    }
    
    if (!RAZORPAY_CONFIG.keyId || RAZORPAY_CONFIG.keyId.includes('your_key_id_here')) {
      errors.push('Razorpay credentials not configured');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// ================================
// USAGE EXAMPLES
// ================================

/*
// Example 1: Initialize Razorpay with your bank details
const razorpay = require('razorpay');
const { RAZORPAY_CONFIG } = require('./paymentGatewayConfig');

const razorpayInstance = new razorpay({
  key_id: RAZORPAY_CONFIG.keyId,
  key_secret: RAZORPAY_CONFIG.keySecret
});

// Example 2: Create payment order
const order = await razorpayInstance.orders.create({
  amount: 50000, // ₹500 in paise
  currency: 'INR',
  receipt: 'order_receipt_123',
  payment_capture: 1
});

// Example 3: Verify payment signature
const crypto = require('crypto');
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_CONFIG.keySecret)
    .update(body.toString())
    .digest('hex');
  
  return expectedSignature === signature;
};
*/ 