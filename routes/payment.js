const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const UserService = require('../services/userService');

// Middleware to ensure database connection
const ensureDbConnection = async (req, res, next) => {
  try {
    const database = require('../config/database');
    const status = database.getConnectionStatus();
    if (status.status !== 'connected') {
      console.log('Database not connected, attempting to connect...');
      await database.connect();
      console.log('Database connected successfully');
    }
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed'
    });
  }
};

// Middleware to validate session
const validateSession = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      error: 'Session expired. Please log in again.'
    });
  }
  next();
};

// Get available subscription plans
router.get('/plans', validateSession, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const user = await UserService.getUserByEmail(userEmail);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const currentPlan = user.subscription?.plan || 'free';
    const availablePlans = paymentService.getAvailablePlans(currentPlan);
    const subscriptionStatus = paymentService.getSubscriptionStatus(user);

    res.json({
      success: true,
      currentPlan: subscriptionStatus,
      availablePlans: availablePlans,
      canUpgrade: subscriptionStatus.canUpgrade
    });

  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans'
    });
  }
});

// Start trial subscription
router.post('/trial/start', validateSession, ensureDbConnection, async (req, res) => {
  try {
    const { planId } = req.body;
    const userEmail = req.session.user.email;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required'
      });
    }

    const user = await UserService.getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user can start trial
    const trialCheck = paymentService.canStartTrial(user, planId);
    if (!trialCheck.canStart) {
      return res.status(400).json({
        success: false,
        error: trialCheck.reason
      });
    }

    // Start trial
    const trialResult = await paymentService.startTrial(user._id, planId);
    
    // Update user subscription in database
    await UserService.updateSubscription(userEmail, trialResult.subscription);

    // Update session
    req.session.user.subscription = trialResult.subscription;

    res.json({
      success: true,
      message: trialResult.message,
      subscription: trialResult.subscription,
      trialDays: trialResult.trialDays,
      validUntil: trialResult.validUntil
    });

  } catch (error) {
    console.error('Start trial error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start trial: ' + error.message
    });
  }
});

// Generate payment QR code
router.post('/qr/generate', validateSession, async (req, res) => {
  try {
    const { planId, gateway = 'RAZORPAY' } = req.body;
    const userId = req.session.user._id;

    console.log('QR generation request:', { planId, gateway, userId });

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Get plan details
    const plan = paymentService.subscriptionPlans[planId.toUpperCase()];
    if (!plan) {
      console.error('Invalid plan ID:', planId);
      console.log('Available plans:', Object.keys(paymentService.subscriptionPlans));
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription plan'
      });
    }

    console.log('Plan found:', plan);

    // Validate gateway
    if (!paymentService.paymentGateways[gateway]) {
      console.error('Invalid gateway:', gateway);
      console.log('Available gateways:', Object.keys(paymentService.paymentGateways));
      return res.status(400).json({
        success: false,
        error: 'Invalid payment gateway'
      });
    }

    // Generate QR code
    const qrResult = await paymentService.generatePaymentQR(userId, planId, plan.price, gateway);

    console.log('QR generation successful:', { paymentId: qrResult.paymentId, amount: qrResult.amount });

    res.json({
      success: true,
      ...qrResult,
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        duration: plan.duration,
        features: plan.features
      }
    });

  } catch (error) {
    console.error('Generate QR error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to generate payment QR: ' + error.message
    });
  }
});

// Verify payment
router.post('/verify', validateSession, ensureDbConnection, async (req, res) => {
  try {
    const { paymentId, verificationCode } = req.body;
    const userEmail = req.session.user.email;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID is required'
      });
    }

    // Verify payment
    const verificationResult = await paymentService.verifyPayment(paymentId, verificationCode);

    if (!verificationResult.success) {
      return res.status(400).json(verificationResult);
    }

    // Activate subscription
    const activationResult = await paymentService.activateSubscription(
      req.session.user._id,
      verificationResult.planId,
      {
        transactionId: verificationResult.transactionId,
        paymentId: verificationResult.paymentId,
        gateway: 'RAZORPAY'
      }
    );

    // Update user subscription in database
    await UserService.updateSubscription(userEmail, activationResult.subscription);
    
    // Add payment to history
    await UserService.addPayment(userEmail, activationResult.payment);

    // Update session
    req.session.user.subscription = activationResult.subscription;

    res.json({
      success: true,
      message: 'Payment verified and subscription activated successfully!',
      subscription: activationResult.subscription,
      payment: activationResult.payment,
      activatedAt: activationResult.activatedAt,
      validUntil: activationResult.validUntil
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed: ' + error.message
    });
  }
});

// Check payment status
router.get('/status/:paymentId', validateSession, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const session = paymentService.getPaymentSession(paymentId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Payment session not found or expired'
      });
    }

    res.json({
      success: true,
      paymentId: session.paymentId,
      status: session.status,
      amount: session.amount,
      planId: session.planId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      timeRemaining: Math.max(0, Math.floor((new Date(session.expiresAt) - new Date()) / 1000))
    });

  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment status'
    });
  }
});

// Get subscription status
router.get('/subscription/status', validateSession, ensureDbConnection, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const user = await UserService.getUserByEmail(userEmail);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const subscriptionStatus = paymentService.getSubscriptionStatus(user);
    const usageStats = paymentService.getUsageStats(user);
    const paymentHistory = paymentService.getPaymentHistory(user);

    res.json({
      success: true,
      subscription: subscriptionStatus,
      usage: usageStats,
      paymentHistory: paymentHistory
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription status'
    });
  }
});

// Cancel subscription
router.post('/subscription/cancel', validateSession, ensureDbConnection, async (req, res) => {
  try {
    const { reason } = req.body;
    const userEmail = req.session.user.email;

    const user = await UserService.getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Cancel subscription
    const cancellationResult = await paymentService.cancelSubscription(user._id, reason);
    
    // Update subscription in database
    const updatedSubscription = {
      ...user.subscription,
      status: 'cancelled',
      autoRenew: false,
      cancelledAt: cancellationResult.cancelledAt,
      cancellationReason: reason
    };

    await UserService.updateSubscription(userEmail, updatedSubscription);

    // Update session
    req.session.user.subscription = updatedSubscription;

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      cancellation: cancellationResult,
      subscription: updatedSubscription
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription: ' + error.message
    });
  }
});

// Check feature access
router.get('/features/:feature', validateSession, ensureDbConnection, async (req, res) => {
  try {
    const { feature } = req.params;
    const userEmail = req.session.user.email;

    const user = await UserService.getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const hasAccess = paymentService.hasFeatureAccess(user, feature);
    const subscriptionStatus = paymentService.getSubscriptionStatus(user);

    res.json({
      success: true,
      feature: feature,
      hasAccess: hasAccess,
      currentPlan: subscriptionStatus.plan.name,
      upgradeRequired: !hasAccess && subscriptionStatus.canUpgrade
    });

  } catch (error) {
    console.error('Check feature access error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check feature access'
    });
  }
});

// Get payment gateways
router.get('/gateways', validateSession, (req, res) => {
  try {
    const gateways = Object.entries(paymentService.paymentGateways).map(([key, gateway]) => ({
      id: key,
      name: gateway.name,
      icon: `/images/gateways/${key.toLowerCase()}.png`, // Add gateway icons
      popular: key === 'RAZORPAY' // Mark popular gateway
    }));

    res.json({
      success: true,
      gateways: gateways,
      recommended: 'RAZORPAY'
    });

  } catch (error) {
    console.error('Get gateways error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment gateways'
    });
  }
});

// Simulate payment success (for demo purposes)
router.post('/simulate/success', validateSession, ensureDbConnection, async (req, res) => {
  try {
    const { paymentId } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID is required'
      });
    }

    // Force payment verification to succeed (demo only)
    const verificationResult = await paymentService.verifyPayment(paymentId, '123456'); // Even sum = success

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Payment simulation failed'
      });
    }

    res.json({
      success: true,
      message: 'Payment simulated successfully',
      verificationResult: verificationResult
    });

  } catch (error) {
    console.error('Simulate payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate payment'
    });
  }
});

// Debug endpoint to test UPI URL generation
router.get('/debug/upi-url', validateSession, async (req, res) => {
  try {
    const testUpiUrl = paymentService.createUPIPaymentURL({
      payeeVPA: '8885800887@ptaxis',
      payeeName: 'Fit With AI',
      amount: 2,
      transactionId: 'TEST123',
      transactionNote: 'Test Payment',
      merchantCode: 'FITWITH001'
    });

    res.json({
      success: true,
      upiUrl: testUpiUrl,
      message: 'Test UPI URL generated successfully'
    });

  } catch (error) {
    console.error('Debug UPI URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate test UPI URL'
    });
  }
});


// Get refund status for a payment
router.get('/refund/status/:paymentId', validateSession, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const refundStatus = paymentService.getRefundStatus(paymentId);
    
    res.json({
      success: true,
      paymentId: paymentId,
      ...refundStatus
    });

  } catch (error) {
    console.error('Get refund status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get refund status'
    });
  }
});

// Initiate manual refund (for customer support)
router.post('/refund/manual', validateSession, async (req, res) => {
  try {
    const { paymentId, reason, amount } = req.body;
    
    if (!paymentId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID and reason are required'
      });
    }

    const refundResult = await paymentService.initiateManualRefund(paymentId, reason, amount);
    
    res.json({
      success: true,
      message: 'Manual refund initiated successfully',
      refund: refundResult
    });

  } catch (error) {
    console.error('Manual refund error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate manual refund: ' + error.message
    });
  }
});

// Webhook endpoint for payment gateway refund notifications (simulated)
router.post('/webhook/refund', async (req, res) => {
  try {
    const { refundId, status, gatewayRefundId, amount } = req.body;
    
    // In production, verify webhook signature and authenticity
    console.log(`Refund webhook received: ${refundId} - Status: ${status}`);
    
    // Process refund status update
    // This would update the database with the latest refund status
    
    res.json({
      success: true,
      message: 'Refund webhook processed successfully'
    });

  } catch (error) {
    console.error('Refund webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process refund webhook'
    });
  }
});

module.exports = router;