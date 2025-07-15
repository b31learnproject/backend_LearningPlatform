const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');

const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const User = require('../models/User');
const { protect, authorizeRoles } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');

// Multer setup for PDF only
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/submissions');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user._id}_${Date.now()}${ext}`);
  },
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed'));
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// POST /api/v1/submissions
router.post(
  '/',
  protect,
  authorizeRoles('learner'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    console.log('🔍 DEBUG: Submission POST route called');
    console.log('🔍 DEBUG: Request body:', req.body);
    console.log('🔍 DEBUG: File:', req.file);
    console.log('🔍 DEBUG: User:', req.user._id);

    const { assignment } = req.body;
    if (!assignment) {
      console.log('❌ DEBUG: Assignment ID missing');
      throw new Error('Assignment ID is required');
    }

    console.log('🔍 DEBUG: Looking for assignment:', assignment);
    const assignmentDoc = await Assignment.findById(assignment).populate('course');
    if (!assignmentDoc) {
      console.log('❌ DEBUG: Assignment not found');
      throw new Error('Assignment not found');
    }
    console.log('🔍 DEBUG: Assignment found:', assignmentDoc.name);

    if (!req.file) {
      console.log('❌ DEBUG: No file uploaded');
      throw new Error('File is required');
    }
    console.log('🔍 DEBUG: File uploaded:', req.file.filename);

    let submission = await Submission.findOne({ learner: req.user._id, assignment });

    if (submission) {
      console.log('🔍 DEBUG: Updating existing submission');
      const oldPath = path.join(__dirname, '../', submission.fileUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

      submission.fileUrl = `uploads/submissions/${req.file.filename}`;
      submission.fileName = req.file.originalname;
      submission.submittedAt = new Date();
      submission.status = 'resubmitted';
      await submission.save();
    } else {
      console.log('🔍 DEBUG: Creating new submission');
      submission = await Submission.create({
        assignment,
        learner: req.user._id,
        fileUrl: `uploads/submissions/${req.file.filename}`,
        fileName: req.file.originalname,
        status: 'submitted',
        submittedAt: new Date(),
      });
    }
    console.log('🔍 DEBUG: Submission saved successfully');

    const educator = await User.findById(assignmentDoc.educator);
    const subject = `📄 New Submission: ${assignmentDoc.name}`;
    const html = `
      <p><strong>Assignment:</strong> ${assignmentDoc.name}</p>
      <p><strong>Course:</strong> ${assignmentDoc.course?.title || '-'}</p>
      <p><strong>Learner:</strong> ${req.user.firstName} ${req.user.lastName}</p>
      <p><strong>Submitted at:</strong> ${new Date().toLocaleString()}</p>
    `;

    try {
      await sendEmail({
        to: req.user.email,
        subject: '✅ Submission Received',
        html,
      });
      console.log('🔍 DEBUG: Email sent to learner');
    } catch (emailErr) {
      console.log('⚠️ DEBUG: Failed to send email to learner:', emailErr.message);
    }

    if (educator?.email) {
      try {
        await sendEmail({
          to: educator.email,
          subject,
          html,
        });
        console.log('🔍 DEBUG: Email sent to educator');
      } catch (emailErr) {
        console.log('⚠️ DEBUG: Failed to send email to educator:', emailErr.message);
      }
    }

    console.log('🔍 DEBUG: Sending response');
    res.status(201).json({ message: 'Submission saved', submission });
  })
);

// GET /api/v1/submissions
router.get(
  '/',
  protect,
  authorizeRoles('coordinator', 'educator', 'learner'),
  asyncHandler(async (req, res) => {
    const role = req.user.role;
    let filter = {};

    if (role === 'learner') {
      filter.learner = req.user._id;
    }

    const submissions = await Submission.find(filter)
      .populate({
        path: 'assignment',
        populate: [
          { path: 'course', select: 'title' },
          { path: 'educator', select: 'firstName lastName email' }
        ],
        select: 'name dueDate course educator',
      })
      .populate('learner', 'firstName lastName email')
      .sort({ submittedAt: -1 });

    // For coordinator, add enrollment/payment info
    if (role === 'coordinator') {
      const Enrollment = require('../models/Enrollment');
      
      const enrichedSubmissions = await Promise.all(
        submissions.map(async (submission) => {
          const enrollment = await Enrollment.findOne({
            learner: submission.learner._id,
            course: submission.assignment?.course?._id
          }).select('paymentStatus enrolledAt');

          return {
            ...submission.toObject(),
            paymentStatus: enrollment?.paymentStatus || 'unknown',
            enrolledAt: enrollment?.enrolledAt
          };
        })
      );
      
      return res.json(enrichedSubmissions);
    }

    res.json(submissions);
  })
);

// ✅ GET /api/v1/submissions/my (educator only)
router.get(
  '/my',
  protect,
  authorizeRoles('educator'),
  asyncHandler(async (req, res) => {
    const educatorId = req.user._id;
    console.log('🔍 DEBUG: Educator submissions route called for educator:', educatorId);

    // TEMPORARY: Show all submissions for demo (normally would filter by educator)
    const submissions = await Submission.find()
      .populate({
        path: 'assignment',
        populate: { path: 'course', select: 'title' },
        select: 'name course dueDate educator'
      })
      .populate('learner', 'firstName lastName email')
      .sort({ submittedAt: -1 });

    console.log('🔍 DEBUG: Total submissions found:', submissions.length);
    console.log('🔍 DEBUG: All submissions:', submissions.map(s => ({ 
      id: s._id, 
      assignment: s.assignment?._id, 
      assignmentName: s.assignment?.name,
      courseName: s.assignment?.course?.title,
      learner: s.learner?.firstName + ' ' + s.learner?.lastName 
    })));

    // Filter out submissions without assignments
    const filtered = submissions.filter(s => s.assignment !== null);
    console.log('🔍 DEBUG: Filtered submissions count:', filtered.length);

    res.json(filtered);
  })
);

// ✅ GET /api/v1/submissions/my/zip (educator ZIP export)
router.get(
  '/my/zip',
  protect,
  authorizeRoles('educator'),
  asyncHandler(async (req, res) => {
    const educatorId = req.user._id;
    const submissions = await Submission.find()
      .populate({
        path: 'assignment',
        match: { educator: educatorId },
        select: 'name',
      });

    const filtered = submissions.filter(s => s.assignment !== null);
    const zip = new JSZip();

    for (const s of filtered) {
      const filePath = path.join(__dirname, '../', s.fileUrl);
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath);
        zip.file(s.fileName || path.basename(filePath), fileData);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', 'attachment; filename=submissions.zip');
    res.send(zipBuffer);
  })
);

// PATCH /api/v1/submissions/:id
router.patch(
  '/:id',
  protect,
  authorizeRoles('educator', 'coordinator'),
  asyncHandler(async (req, res) => {
    console.log('🔍 DEBUG: PATCH submission route called');
    console.log('🔍 DEBUG: Submission ID:', req.params.id);
    console.log('🔍 DEBUG: Request body:', req.body);
    console.log('🔍 DEBUG: User:', req.user._id, req.user.role);

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      console.log('❌ DEBUG: Submission not found');
      throw new Error('Submission not found');
    }

    console.log('🔍 DEBUG: Current submission:', {
      id: submission._id,
      currentGrade: submission.grade,
      currentFeedback: submission.feedback,
      currentStatus: submission.status
    });

    const { grade, feedback, status } = req.body;
    
    if (grade !== undefined) {
      console.log('🔍 DEBUG: Setting grade to:', grade);
      submission.grade = grade;
    }
    if (feedback !== undefined) {
      console.log('🔍 DEBUG: Setting feedback to:', feedback);
      submission.feedback = feedback;
    }
    if (status !== undefined) {
      console.log('🔍 DEBUG: Setting status to:', status);
      submission.status = status;
    }

    console.log('🔍 DEBUG: About to save submission...');
    await submission.save();
    console.log('🔍 DEBUG: Submission saved successfully');

    console.log('🔍 DEBUG: Loading related data for email...');
    const learner = await User.findById(submission.learner);
    const assignment = await Assignment.findById(submission.assignment).populate('course');

    console.log('🔍 DEBUG: Related data loaded:', {
      learnerEmail: learner?.email,
      assignmentName: assignment?.name,
      courseName: assignment?.course?.title
    });

    if (learner?.email && assignment) {
      const html = `
        <p>Your assignment <strong>${assignment.name}</strong> for the course <strong>${assignment.course?.title}</strong> has been graded.</p>
        <p><strong>Grade:</strong> ${submission.grade}</p>
        <p><strong>Feedback:</strong> ${submission.feedback || 'No feedback provided'}</p>
      `;

      try {
        await sendEmail({
          to: learner.email,
          subject: `📊 Graded: ${assignment.name}`,
          html,
        });
        console.log('🔍 DEBUG: Email sent successfully');
      } catch (emailErr) {
        console.log('⚠️ DEBUG: Email failed but continuing:', emailErr.message);
      }
    }

    console.log('🔍 DEBUG: Sending response');
    res.json(submission);
  })
);

// DELETE /api/v1/submissions/:id
router.delete(
  '/:id',
  protect,
  authorizeRoles('coordinator'),
  asyncHandler(async (req, res) => {
    const submission = await Submission.findById(req.params.id);
    if (!submission) throw new Error('Submission not found');

    const filePath = path.join(__dirname, '../', submission.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await submission.remove();
    res.json({ message: 'Submission deleted' });
  })
);

module.exports = router;
