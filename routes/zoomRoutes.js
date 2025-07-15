const express = require('express');
const router = express.Router();
const {
  createZoomSession,
  getAllZoomSessions,
  getZoomSessionsByEducator
} = require('../controllers/zoomController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.post('/', protect, authorizeRoles('educator', 'coordinator'), createZoomSession);
router.get('/', protect, getAllZoomSessions);  // This is needed for LiveSessions view
router.get('/educator', protect, authorizeRoles('educator'), getZoomSessionsByEducator);

module.exports = router;
