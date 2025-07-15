// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // ✅ Check admin approval for coordinators and educators
      if ((user.role === 'coordinator' || user.role === 'educator') && user.isApproved === false) {
        return res.status(403).json({
          message: 'Your account is pending admin approval. Please contact the admin.',
        });
      }

      // ✅ ENHANCED: Prevent inactive educators from accessing any protected route
      if (user.role === 'educator' && user.isActive === false) {
        return res.status(403).json({
          message: 'Your account is inactive. Please contact your coordinator.',
        });
      }

      console.log('Decoded user in protect:', user); // Debug log
      req.user = user;
      console.log('About to call next() in protect');
      next();
      console.log('After next() in protect');
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
});

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        console.log('authorizeRoles middleware:', { user: req.user, roles });
        if (!req.user || !roles.includes(req.user.role)) {
            console.log('Role not authorized:', req.user ? req.user.role : 'No user');
            return res.status(403).json({ message: `Role (${req.user?.role}) is not authorized to access this resource.`});
        }
        next();
    }
}

module.exports = {
  protect,
  authorizeRoles
};