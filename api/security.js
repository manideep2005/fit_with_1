const express = require('express');
const router = express.Router();

// Get security alerts
router.get('/alerts', (req, res) => {
  res.json({
    success: true,
    alerts: []
  });
});

module.exports = router;