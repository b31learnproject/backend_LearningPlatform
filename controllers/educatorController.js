// Learning_platform/backend/controllers/educatorController.js
const User = require('../models/User');

// GET all users with role: 'educator'
exports.getAllEducators = async (req, res) => {
  try {
    const educators = await User.find({ role: 'educator' }).select('-password');
    res.status(200).json(educators);
  } catch (err) {
    console.error('Error fetching educators:', err);
    res.status(500).json({ message: 'Failed to retrieve educators' });
  }
};

// DELETE educator by ID
exports.deleteEducator = async (req, res) => {
  try {
    const educator = await User.findOneAndDelete({ _id: req.params.id, role: 'educator' });
    if (!educator) {
      return res.status(404).json({ message: 'Educator not found' });
    }
    res.status(200).json({ message: 'Educator deleted successfully' });
  } catch (err) {
    console.error('Error deleting educator:', err);
    res.status(500).json({ message: 'Failed to delete educator' });
  }
};

// ✅ NEW: Toggle educator active/inactive status
exports.toggleEducatorStatus = async (req, res) => {
  try {
    const educator = await User.findById(req.params.id);
    if (!educator || educator.role !== 'educator') {
      return res.status(404).json({ message: 'Educator not found' });
    }

    // Toggle the isActive status
    educator.isActive = !educator.isActive;
    await educator.save();

    res.status(200).json({
      message: `Educator is now ${educator.isActive ? 'Active' : 'Inactive'}`,
      isActive: educator.isActive,
    });
  } catch (err) {
    console.error('Error toggling educator status:', err);
    res.status(500).json({ message: 'Failed to update educator status' });
  }
};