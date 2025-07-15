const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const {
  createEvaluation,
  getAllEvaluations,
  getEvaluationById,
  updateEvaluation,
  deleteEvaluation,
} = require('../controllers/evaluationController');

const { protect, authorizeRoles } = require('../middleware/auth');

// Route prefix: /api/v1/evaluations

// Create a new evaluation (educator or coordinator only)
router.post(
  '/',
  protect,
  authorizeRoles('educator', 'coordinator'),
  asyncHandler(createEvaluation)
);

// Get paginated list of evaluations (authenticated users)
router.get(
  '/',
  protect,
  asyncHandler(getAllEvaluations)
);

// Get single evaluation by ID (authenticated users)
router.get(
  '/:id',
  protect,
  asyncHandler(getEvaluationById)
);

// Update evaluation (only creator educator or coordinator)
router.patch(
  '/:id',
  protect,
  authorizeRoles('educator', 'coordinator'),
  asyncHandler(updateEvaluation)
);

// Delete evaluation (only creator educator or coordinator)
router.delete(
  '/:id',
  protect,
  authorizeRoles('educator', 'coordinator'),
  asyncHandler(deleteEvaluation)
);

module.exports = router;
