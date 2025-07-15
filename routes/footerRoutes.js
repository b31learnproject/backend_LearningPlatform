// backend/routes/footerRoutes.js
const express = require('express');
const router = express.Router();

// Optional: Secure this route only for logged-in users if needed

router.get('/quick-links', (req, res) => {
  res.json([
    { name: 'Home', to: '/' },
    { name: 'About', to: '/about' },
    { name: 'Contact', to: '/contact' },
    { name: 'Privacy Policy', to: '/privacy-policy' }
  ]);
});

module.exports = router;
