const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const StudyPlan = require('../models/StudyPlan');
const Course = require('../models/Course');
const { protect, authorizeRoles } = require('../middleware/auth');

// ✅ Setup Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/study-materials';
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = file.originalname.split('.')[0].replace(/\s+/g, '-');
    cb(null, `${name}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return cb(new Error('Only PDF, Word, and PPT files are allowed.'));
    }
    cb(null, true);
  },
});

// @route   POST /api/v1/studyplans
// @desc    Create a new study plan
// @access  Private (educator, coordinator)
router.post(
  '/',
  protect,
  authorizeRoles('educator', 'coordinator'),
  upload.single('material'),
  asyncHandler(async (req, res) => {
    const { course, title, description, schedule } = req.body;

    if (!course || !title) {
      res.status(400);
      throw new Error('Course and title are required');
    }

    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      res.status(404);
      throw new Error('Course not found');
    }

    if (
      req.user.role === 'educator' &&
      courseDoc.educator.toString() !== req.user._id.toString()
    ) {
      res.status(403);
      throw new Error('Not authorized to create study plan for this course');
    }

    let parsedSchedule = [];
    if (schedule) {
      if (typeof schedule === 'string') {
        try {
          parsedSchedule = JSON.parse(schedule);
        } catch {
          res.status(400);
          throw new Error('Invalid schedule format');
        }
      } else if (Array.isArray(schedule)) {
        parsedSchedule = schedule;
      } else {
        res.status(400);
        throw new Error('Schedule must be an array or JSON string');
      }
    }

    const studyPlan = new StudyPlan({
      course,
      educator: req.user._id,
      title,
      description,
      schedule: parsedSchedule,
      materials: req.file
        ? [
            {
              fileName: req.file.originalname,
              fileUrl: `/uploads/study-materials/${req.file.filename}`,
            },
          ]
        : [],
    });

    await studyPlan.save();
    res.status(201).json(studyPlan);
  })
);

// @route   GET /api/v1/studyplans
// @desc    Get all study plans (optionally filtered by course)
// @access  Private (all authenticated)
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const { course } = req.query;
    const filter = {};
    if (course) {
      filter.course = course;
    }

    const studyPlans = await StudyPlan.find(filter)
      .populate('course', 'title startDate')
      .populate('educator', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(studyPlans);
  })
);

// @route   GET /api/v1/studyplans/:id
// @desc    Get study plan by ID
// @access  Private
router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const studyPlan = await StudyPlan.findById(req.params.id)
      .populate('course', 'title')
      .populate('educator', 'firstName lastName email');

    if (!studyPlan) {
      res.status(404);
      throw new Error('Study plan not found');
    }

    res.json(studyPlan);
  })
);

// @route   PATCH /api/v1/studyplans/:id
// @desc    Update a study plan
// @access  Private (owner educator or coordinator)
router.patch(
  '/:id',
  protect,
  authorizeRoles('educator', 'coordinator'),
  upload.single('material'),
  asyncHandler(async (req, res) => {
    const studyPlan = await StudyPlan.findById(req.params.id);

    if (!studyPlan) {
      res.status(404);
      throw new Error('Study plan not found');
    }

    if (
      studyPlan.educator.toString() !== req.user._id.toString() &&
      req.user.role !== 'coordinator'
    ) {
      res.status(403);
      throw new Error('Not authorized to update this study plan');
    }

    const { title, description, schedule } = req.body;

    if (title !== undefined) studyPlan.title = title;
    if (description !== undefined) studyPlan.description = description;
    if (schedule !== undefined) {
      if (typeof schedule === 'string') {
        try {
          studyPlan.schedule = JSON.parse(schedule);
        } catch {
          res.status(400);
          throw new Error('Invalid schedule format');
        }
      } else if (Array.isArray(schedule)) {
        studyPlan.schedule = schedule;
      } else {
        res.status(400);
        throw new Error('Schedule must be an array or JSON string');
      }
    }

    if (req.file) {
      studyPlan.materials.push({
        fileName: req.file.originalname,
        fileUrl: `/uploads/study-materials/${req.file.filename}`,
      });
    }

    const updated = await studyPlan.save();
    res.json(updated);
  })
);

// @route   DELETE /api/v1/studyplans/:id
// @desc    Delete a study plan
// @access  Private (owner educator or coordinator)
router.delete(
  '/:id',
  protect,
  authorizeRoles('educator', 'coordinator'),
  asyncHandler(async (req, res) => {
    const studyPlan = await StudyPlan.findById(req.params.id);

    if (!studyPlan) {
      res.status(404);
      throw new Error('Study plan not found');
    }

    if (
      studyPlan.educator.toString() !== req.user._id.toString() &&
      req.user.role !== 'coordinator'
    ) {
      res.status(403);
      throw new Error('Not authorized to delete this study plan');
    }

    await StudyPlan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Study plan deleted successfully' });
  })
);

// @route   GET /api/v1/studyplans/download/:fileName
// @desc    Download study material file
// @access  Private (authenticated users)
router.get(
  '/download/:fileName',
  protect,
  asyncHandler(async (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, '../uploads/study-materials', fileName);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.status(404);
      throw new Error('File not found');
    }

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Send file
    res.sendFile(filePath);
  })
);

// @route   GET /api/v1/studyplans/view/:fileName
// @desc    View study material file in browser
// @access  Private (authenticated users)
router.get(
  '/view/:fileName',
  protect,
  asyncHandler(async (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, '../uploads/study-materials', fileName);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.status(404);
      throw new Error('File not found');
    }

    // Get file extension to set appropriate content type
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case '.ppt':
        contentType = 'application/vnd.ms-powerpoint';
        break;
      case '.pptx':
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath);
  })
);

module.exports = router;
