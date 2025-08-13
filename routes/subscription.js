const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');

// Renew subscription
router.post('/renew', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const { planId } = req.body;
    
    const user = await UserService.getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Check if subscription is still active
    const now = new Date();
    const expiresAt = new Date(user.subscription?.expiresAt);
    const daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
    
    if (daysRemaining > 7) {
      return res.status(400).json({ 
        success: false, 
        error: `Subscription is still active for ${daysRemaining} days. You can renew when less than 7 days remain.`,
        daysRemaining: daysRemaining
      });
    }
    
    // Generate renewal payment
    const plans = {
      basic: { name: 'Basic Pro', price: 2 },
      premium: { name: 'Premium Pro', price: 5 },
      yearly: { name: 'Yearly Premium', price: 10 }
    };
    
    const plan = plans[planId];
    if (!plan) {
      return res.status(400).json({ success: false, error: 'Invalid plan' });
    }
    
    const paymentId = 'renew_' + Date.now();
    const upiUrl = `upi://pay?pa=8885800887@ptaxis&pn=Fit With AI&am=${plan.price}&cu=INR&tn=Renewal ${plan.name}`;
    
    res.json({
      success: true,
      renewal: true,
      paymentId,
      plan,
      amount: plan.price,
      daysRemaining: daysRemaining,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`,
      upiUrl,
      message: `Renewing ${plan.name} subscription`
    });
    
  } catch (error) {
    console.error('Renew subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to process renewal' });
  }
});

// Cancel subscription
router.post('/cancel', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    
    const user = await UserService.getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Update subscription to cancel auto-renewal
    const updatedSubscription = {
      ...user.subscription,
      autoRenew: false,
      cancelledAt: new Date(),
      status: 'cancelled'
    };
    
    await UserService.updateSubscription(userEmail, updatedSubscription);
    
    // Update session
    req.session.user.subscription = updatedSubscription;
    
    res.json({
      success: true,
      message: 'Subscription cancelled. You can continue using premium features until expiry.',
      subscription: updatedSubscription
    });
    
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

// Get payment history
router.get('/payments', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const user = await UserService.getUserByEmail(userEmail);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const payments = (user.paymentHistory || []).map(payment => ({
      ...payment,
      formattedDate: new Date(payment.date).toLocaleDateString('en-IN'),
      formattedAmount: `Rs.${payment.amount}`
    })).reverse(); // Latest first
    
    res.json({
      success: true,
      payments: payments,
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0)
    });
    
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get payment history' });
  }
});

module.exports = router;