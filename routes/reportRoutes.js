// backend/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const Enrollment = require('../models/Enrollment');
const { generateReceiptZip } = require('../utils/reportUtils');
const { sendEmailWithAttachment } = require('../utils/sendEmail');
const path = require('path');
const fs = require('fs');

// ✅ Correctly import the middleware function
const { protect } = require('../middleware/auth');

const TEMP_ZIP_PATH = path.join(__dirname, '../temp/receipts.zip');

// Route: GET /api/reports/bulk-receipts
router.get('/bulk-receipts', protect, async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== 'admin' && role !== 'coordinator') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const enrollments = await Enrollment.find({ paymentStatus: 'success' })
      .populate('learner')
      .populate('course');

    await generateReceiptZip(enrollments, TEMP_ZIP_PATH);

    res.download(TEMP_ZIP_PATH, 'receipts.zip', (err) => {
      if (fs.existsSync(TEMP_ZIP_PATH)) {
        fs.unlinkSync(TEMP_ZIP_PATH);
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ZIP generation failed' });
  }
});

// Route: GET /api/reports/weekly-email
router.get('/weekly-email', protect, async (req, res) => {
  try {
    const enrollments = await Enrollment.find().populate('learner').populate('course');

    const stats = {
      total: enrollments.length,
      success: enrollments.filter(e => e.paymentStatus === 'success').length,
      failed: enrollments.filter(e => e.paymentStatus === 'failed').length,
      pending: enrollments.filter(e => e.paymentStatus === 'pending').length,
    };

    const body = `
      <h3>Weekly Enrollment Report</h3>
      <p>Total Enrollments: ${stats.total}</p>
      <p>Successful: ${stats.success}</p>
      <p>Failed: ${stats.failed}</p>
      <p>Pending: ${stats.pending}</p>
    `;

    await sendEmailWithAttachment({
      to: process.env.ADMIN_EMAIL,
      subject: 'Weekly Enrollment Report',
      html: body,
    });

    res.json({ message: 'Email sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Email sending failed' });
  }
});

module.exports = router;
