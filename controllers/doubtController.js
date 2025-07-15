const asyncHandler = require('express-async-handler');
const DoubtSession = require('../models/DoubtSession');

// Get all active and future doubt sessions
exports.getLiveDoubtSessions = asyncHandler(async (req, res) => {
  const now = new Date();
  const sessions = await DoubtSession.find({
    scheduledDate: { $gte: now },
    isActive: true,
  });
  res.json(sessions);
});

// Create a new doubt session
exports.createDoubtSession = asyncHandler(async (req, res) => {
  const { topic, description, scheduledDate, durationMinutes, link } = req.body;

  if (!topic || !scheduledDate || !durationMinutes) {
    res.status(400);
    throw new Error('Missing required fields');
  }

  const newSession = new DoubtSession({
    topic,
    description,
    scheduledDate,
    durationMinutes,
    link,
    createdBy: req.user._id,
    isActive: true,
  });

  await newSession.save();
  res.status(201).json(newSession);
});
