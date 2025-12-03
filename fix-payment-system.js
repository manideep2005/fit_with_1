// Simple payment verification system
const express = require('express');
const router = express.Router();

// Store payment sessions in memory (use Redis in production)
const paymentSessions = new Map();

// Generate payment QR
router.post('/generate-qr', (req, res) => {
  const { planId } = req.body;
  const plans = {
    basic: { name: 'Basic Pro', price: 2 },
    premium: { name: 'Premium Pro', price: 5 },
    yearly: { name: 'Yearly Premium', price: 50 }
  };
  
  const plan = plans[planId];
  if (!plan) {
    return res.status(400).json({ success: false, error: 'Invalid plan' });
  }
  
  const paymentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const upiUrl = `upi://pay?pa=8885800887@ptaxis&pn=Fit With AI&am=${plan.price}&cu=INR&tn=Sub ${plan.name}&tr=${paymentId}`;
  
  // Store payment session
  paymentSessions.set(paymentId, {
    planId,
    amount: plan.price,
    status: 'pending',
    createdAt: Date.now(),
    userId: req.session.user._id
  });
  
  res.json({
    success: true,
    paymentId,
    plan,
    amount: plan.price,
    qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`,
    upiUrl,
    expiresIn: 900
  });
});

// Check payment status
router.post('/check-status', (req, res) => {
  const { paymentId } = req.body;
  const session = paymentSessions.get(paymentId);
  
  if (!session) {
    return res.json({ success: false, error: 'Payment session not found' });
  }
  
  // Auto-approve after 30 seconds for demo
  const timeElapsed = Date.now() - session.createdAt;
  const paymentReceived = timeElapsed > 30000;
  
  if (paymentReceived && session.status === 'pending') {
    session.status = 'completed';
    paymentSessions.set(paymentId, session);
  }
  
  res.json({
    success: true,
    paymentReceived: session.status === 'completed',
    timeElapsed: Math.floor(timeElapsed / 1000)
  });
});

// Manual verification
router.post('/verify-manual', (req, res) => {
  const { paymentId } = req.body;
  const session = paymentSessions.get(paymentId);
  
  if (!session) {
    return res.json({ success: false, error: 'Payment session not found' });
  }
  
  session.status = 'completed';
  paymentSessions.set(paymentId, session);
  
  res.json({ success: true, paymentReceived: true });
});

module.exports = router;