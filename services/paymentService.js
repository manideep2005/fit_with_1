const crypto = require('crypto');
const QRCode = require('qrcode');

class PaymentService {
  constructor() {
    this.paymentMethods = {
      UPI: 'upi',
      CARD: 'card',
      WALLET: 'wallet',
      NETBANKING: 'netbanking'
    };

    this.subscriptionPlans = {
      FREE: {
        id: 'free',
        name: 'Free Plan',
        price: 0,
        duration: 'lifetime',
        features: ['Basic workouts', 'Limited AI coach (5 queries/day)', 'Basic nutrition tracking'],
        limits: {
          aiQueries: 5,
          workoutPlans: 3,
          nutritionLogs: 30
        }
      },
      WEEKLY: {
        id: 'weekly',
        name: 'Premium Weekly',
        price: 10,
        duration: 'weekly',
        trialDays: 0,
        features: ['All premium workouts', 'Unlimited AI coach', 'Advanced nutrition tracking', 'Progress analytics', 'Custom meal plans', 'Health rewards'],
        limits: {
          aiQueries: -1, // unlimited
          workoutPlans: -1,
          nutritionLogs: -1
        }
      },
      MONTHLY: {
        id: 'monthly',
        name: 'Premium Monthly',
        price: 10,
        duration: 'monthly',
        trialDays: 0,
        features: ['All premium workouts', 'Unlimited AI coach', 'Advanced nutrition tracking', 'Progress analytics', 'Custom meal plans', 'Health rewards', 'Priority support'],
        limits: {
          aiQueries: -1, // unlimited
          workoutPlans: -1,
          nutritionLogs: -1
        }
      },
      QUARTERLY: {
        id: 'quarterly',
        name: 'Premium Quarterly',
        price: 10,
        duration: 'quarterly',
        trialDays: 0,
        features: ['All premium workouts', 'Unlimited AI coach', 'Advanced nutrition tracking', 'Progress analytics', 'Custom meal plans', 'Health rewards', 'Priority support', 'Exclusive content'],
        limits: {
          aiQueries: -1, // unlimited
          workoutPlans: -1,
          nutritionLogs: -1
        }
      },
      YEARLY: {
        id: 'yearly',
        name: 'Premium Yearly',
        price: 10,
        duration: 'yearly',
        trialDays: 0,
        features: ['All premium workouts', 'Unlimited AI coach', 'Advanced nutrition tracking', 'Progress analytics', 'Custom meal plans', 'Health rewards', 'Priority support', 'Exclusive content', 'Personal trainer sessions'],
        limits: {
          aiQueries: -1,
          workoutPlans: -1,
          nutritionLogs: -1
        }
      }
    };

    // Real UPI ID for payments
    this.paymentGateways = {
      RAZORPAY: {
        name: 'Razorpay',
        upiId: '8885800887@ptaxis',
        merchantId: 'FITWITH001'
      },
      PAYTM: {
        name: 'Paytm',
        upiId: '8885800887@ptaxis',
        merchantId: 'FITWITH002'
      },
      PHONEPE: {
        name: 'PhonePe',
        upiId: '8885800887@ptaxis',
        merchantId: 'FITWITH003'
      }
    };
  }

  // Generate payment QR code for subscription
  async generatePaymentQR(userId, planId, amount, gateway = 'RAZORPAY') {
    try {
      const plan = this.subscriptionPlans[planId.toUpperCase()];
      if (!plan) {
        throw new Error('Invalid subscription plan');
      }

      const paymentId = this.generatePaymentId();
      const gatewayConfig = this.paymentGateways[gateway];
      
      // Create UPI payment URL
      const upiUrl = this.createUPIPaymentURL({
        payeeVPA: gatewayConfig.upiId,
        payeeName: 'Fit With AI',
        amount: amount,
        transactionId: paymentId,
        transactionNote: `${plan.name} Subscription`,
        merchantCode: gatewayConfig.merchantId
      });

      // Generate QR code
      const qrCodeDataURL = await QRCode.toDataURL(upiUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Store payment session (in production, use Redis or database)
      const paymentSession = {
        paymentId,
        userId,
        planId,
        amount,
        gateway,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 60 minutes (1 hour)
        upiUrl,
        qrCode: qrCodeDataURL
      };

      // In production, store this in Redis or database
      this.storePaymentSession(paymentId, paymentSession);

      return {
        success: true,
        paymentId,
        qrCode: qrCodeDataURL,
        upiUrl,
        amount,
        plan: plan.name,
        expiresIn: 60 * 60, // seconds
        instructions: this.getPaymentInstructions(gateway)
      };

    } catch (error) {
      console.error('QR generation error:', error);
      throw new Error('Failed to generate payment QR code');
    }
  }

  // Create UPI payment URL
  createUPIPaymentURL({ payeeVPA, payeeName, amount, transactionId, transactionNote, merchantCode }) {
    try {
      // Validate inputs
      if (!payeeVPA || !amount || amount <= 0) {
        throw new Error('Invalid payment parameters');
      }

      // Use the standard UPI URL format that works with all UPI apps
      const params = new URLSearchParams({
        pa: payeeVPA,
        pn: payeeName || 'Fit With AI',
        am: amount.toString(),
        cu: 'INR',
        tn: transactionNote || 'Subscription Payment',
        tr: transactionId || this.generatePaymentId()
      });

      const upiUrl = `upi://pay?${params.toString()}`;
      console.log('Generated UPI URL:', upiUrl);
      
      // Also create a fallback URL for web browsers
      const webUrl = `https://upiqr.in/api/qr?format=png&size=300&data=${encodeURIComponent(upiUrl)}`;
      
      return upiUrl;
    } catch (error) {
      console.error('Error creating UPI URL:', error);
      throw new Error('Failed to create payment URL');
    }
  }

  // Generate unique payment ID
  generatePaymentId() {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `PAY_${timestamp}_${random}`;
  }

  // Store payment session (mock implementation)
  storePaymentSession(paymentId, session) {
    // In production, use Redis or database
    if (!global.paymentSessions) {
      global.paymentSessions = new Map();
    }
    global.paymentSessions.set(paymentId, session);
    
    // Auto-expire after 60 minutes (1 hour)
    setTimeout(() => {
      if (global.paymentSessions) {
        global.paymentSessions.delete(paymentId);
      }
    }, 60 * 60 * 1000);
  }

  // Get payment session
  getPaymentSession(paymentId) {
    if (!global.paymentSessions) {
      return null;
    }
    return global.paymentSessions.get(paymentId);
  }

  // Simulate payment verification (in production, use webhook from payment gateway)
  async verifyPayment(paymentId, verificationCode = null) {
    try {
      const session = this.getPaymentSession(paymentId);
      
      if (!session) {
        return {
          success: false,
          error: 'Payment session not found or expired'
        };
      }

      if (session.status !== 'pending') {
        return {
          success: false,
          error: 'Payment already processed'
        };
      }

      // Simulate payment verification
      // In production, verify with actual payment gateway,
      const isPaymentSuccessful = this.simulatePaymentVerification(session, verificationCode);

      if (isPaymentSuccessful) {
        session.status = 'completed';
        session.completedAt = new Date();
        
        return {
          success: true,
          paymentId,
          amount: session.amount,
          planId: session.planId,
          transactionId: this.generateTransactionId(),
          completedAt: session.completedAt
        };
      } else {
        // Payment failed - initiate automatic refund if money was deducted
        session.status = 'failed';
        session.failedAt = new Date();
        
        // Check if money was actually deducted (in real scenario, check with bank/gateway)
        const wasMoneyDeducted = this.checkIfMoneyWasDeducted(session);
        
        if (wasMoneyDeducted) {
          console.log(`Money was deducted for failed payment ${paymentId}, initiating refund...`);
          
          // Initiate automatic refund
          const refundResult = await this.initiateAutomaticRefund(session);
          
          return {
            success: false,
            error: 'Payment verification failed',
            refund: refundResult,
            message: 'Payment failed but money was deducted. Automatic refund has been initiated.'
          };
        }
        
        return {
          success: false,
          error: 'Payment verification failed'
        };
      }

    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        error: 'Payment verification failed'
      };
    }
  }

  // Simulate payment verification (for demo purposes)
  simulatePaymentVerification(session, verificationCode) {
    // For demo: if verification code is provided and matches pattern, consider it successful
    if (verificationCode) {
      // Simple pattern: code should be 6 digits and sum should be even
      const codePattern = /^\d{6}$/;
      if (codePattern.test(verificationCode)) {
        const sum = verificationCode.split('').reduce((acc, digit) => acc + parseInt(digit), 0);
        return sum % 2 === 0; // Even sum = successful payment
      }
    }
    
    // For demo without verification code: 80% success rate
    // For real payment detection, check if enough time has passed since QR generation
    // This simulates a user actually making a payment
    const timeSinceCreation = Date.now() - new Date(session.createdAt).getTime();
    const minPaymentTime = 10000; // 30 seconds minimum
    
    // If enough time has passed, assume payment might be completed
    if (timeSinceCreation > minPaymentTime) {
      // Higher success rate for manual checks (85%)
      return Math.random() > 0.05;
    }
    
    // Lower success rate for immediate checks (30%)
    return Math.random() > 0.4;
  }

  // Generate transaction ID
  generateTransactionId() {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `TXN_${timestamp}_${random}`;
  }

  // Get payment instructions for different gateways
  getPaymentInstructions(gateway) {
    const instructions = {
      RAZORPAY: [
        'Open any UPI app (PhonePe, Paytm, GPay, etc.)',
        'Scan the QR code or click the UPI link',
        'Verify the amount and merchant details',
        'Enter your UPI PIN to complete payment',
        'Payment will be verified automatically'
      ],
      PAYTM: [
        'Open Paytm app or any UPI app',
        'Scan the QR code using the scanner',
        'Confirm payment details',
        'Enter your UPI PIN',
        'Wait for payment confirmation'
      ],
      PHONEPE: [
        'Open PhonePe or any UPI app',
        'Tap on "Scan & Pay"',
        'Scan the QR code',
        'Verify amount and complete payment',
        'You will receive instant confirmation'
      ]
    };

    return instructions[gateway] || instructions.RAZORPAY;
  }

  // Process subscription activation after successful payment
  async activateSubscription(userId, planId, paymentDetails) {
    try {
      const plan = this.subscriptionPlans[planId.toUpperCase()];
      if (!plan) {
        throw new Error('Invalid subscription plan');
      }

      const now = new Date();
      let endDate = new Date();

      // Calculate subscription end date
      if (plan.duration === 'weekly') {
        endDate.setDate(endDate.getDate() + 7);
      } else if (plan.duration === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (plan.duration === 'quarterly') {
        endDate.setMonth(endDate.getMonth() + 3);
      } else if (plan.duration === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // Create subscription data
      const subscriptionData = {
        plan: plan.id,
        status: 'active',
        startDate: now,
        endDate: plan.duration === 'lifetime' ? null : endDate,
        autoRenew: true,
        trialUsed: false,
        features: plan.features,
        limits: plan.limits
      };

      // Create payment record
      const paymentRecord = {
        date: now,
        amount: plan.price,
        plan: plan.name,
        duration: plan.duration,
        paymentMethod: 'UPI',
        transactionId: paymentDetails.transactionId,
        paymentId: paymentDetails.paymentId,
        status: 'completed',
        gateway: paymentDetails.gateway || 'RAZORPAY'
      };

      return {
        subscription: subscriptionData,
        payment: paymentRecord,
        activatedAt: now,
        validUntil: endDate
      };

    } catch (error) {
      console.error('Subscription activation error:', error);
      throw new Error('Failed to activate subscription');
    }
  }

  // Start trial subscription
  async startTrial(userId, planId) {
    try {
      const plan = this.subscriptionPlans[planId.toUpperCase()];
      if (!plan || !plan.trialDays) {
        throw new Error('Trial not available for this plan');
      }

      const now = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + plan.trialDays);

      const trialSubscription = {
        plan: plan.id,
        status: 'trial',
        startDate: now,
        endDate: trialEndDate,
        autoRenew: false,
        trialUsed: true,
        trialDays: plan.trialDays,
        features: plan.features,
        limits: plan.limits
      };

      return {
        subscription: trialSubscription,
        trialDays: plan.trialDays,
        validUntil: trialEndDate,
        message: `${plan.trialDays}-day trial activated successfully!`
      };

    } catch (error) {
      console.error('Trial activation error:', error);
      throw new Error('Failed to start trial');
    }
  }

  // Check if user can start trial
  canStartTrial(user, planId) {
    const plan = this.subscriptionPlans[planId.toUpperCase()];
    if (!plan || !plan.trialDays) {
      return { canStart: false, reason: 'Trial not available for this plan' };
    }

    // Check if user already used trial for this plan
    const hasUsedTrial = user.subscription?.trialUsed || false;
    if (hasUsedTrial) {
      return { canStart: false, reason: 'Trial already used' };
    }

    // Check if user has active subscription
    if (user.subscription?.status === 'active' && user.subscription?.plan !== 'free') {
      return { canStart: false, reason: 'Already have active subscription' };
    }

    return { canStart: true };
  }

  // Get subscription status and features
  getSubscriptionStatus(user) {
    const subscription = user.subscription || { plan: 'free', status: 'active' };
    const plan = this.subscriptionPlans[subscription.plan?.toUpperCase()] || this.subscriptionPlans.FREE;

    const now = new Date();
    let isActive = subscription.status === 'active' || subscription.status === 'trial';
    let daysRemaining = null;

    if (subscription.endDate) {
      const endDate = new Date(subscription.endDate);
      daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= 0) {
        isActive = false;
      }
    }

    return {
      plan: plan,
      status: subscription.status || 'active',
      isActive,
      isTrial: subscription.status === 'trial',
      daysRemaining,
      features: plan.features,
      limits: plan.limits,
      canUpgrade: plan.id === 'free' || plan.id === 'basic',
      nextBillingDate: subscription.endDate,
      autoRenew: subscription.autoRenew || false
    };
  }

  // Get available plans for upgrade
  getAvailablePlans(currentPlan = 'free') {
    const current = currentPlan.toLowerCase();
    const plans = Object.values(this.subscriptionPlans);
    
    return plans.filter(plan => {
      if (current === 'free') {
        return plan.id !== 'free';
      } else if (current === 'basic') {
        return ['premium', 'yearly_basic', 'yearly_premium'].includes(plan.id);
      } else if (current === 'premium') {
        return ['yearly_premium'].includes(plan.id);
      }
      return false;
    });
  }

  // Cancel subscription
  async cancelSubscription(userId, reason = null) {
    try {
      const now = new Date();
      
      return {
        status: 'cancelled',
        cancelledAt: now,
        reason: reason,
        // Keep access until current billing period ends
        accessUntil: null, // Will be set based on current subscription
        refundEligible: false // Implement refund logic as needed
      };

    } catch (error) {
      console.error('Subscription cancellation error:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  // Process refund (mock implementation)
  async processRefund(paymentId, amount, reason) {
    try {
      const refundId = this.generateRefundId();
      
      // In production, integrate with payment gateway refund API
      const refund = {
        refundId,
        paymentId,
        amount,
        reason,
        status: 'processed',
        processedAt: new Date(),
        estimatedDays: 5 // Business days for refund
      };

      return refund;

    } catch (error) {
      console.error('Refund processing error:', error);
      throw new Error('Failed to process refund');
    }
  }

  // Generate refund ID
  generateRefundId() {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `REF_${timestamp}_${random}`;
  }

  // Get payment history
  getPaymentHistory(user) {
    const payments = user.subscription?.paymentHistory || [];
    
    return payments.map(payment => ({
      ...payment,
      formattedDate: new Date(payment.date).toLocaleDateString('en-IN'),
      formattedAmount: `₹${payment.amount}`,
      statusColor: payment.status === 'completed' ? 'success' : 
                   payment.status === 'pending' ? 'warning' : 'danger'
    }));
  }

  // Check feature access
  hasFeatureAccess(user, feature) {
    const status = this.getSubscriptionStatus(user);
    
    if (!status.isActive) {
      return false;
    }

    const premiumPlans = ['weekly', 'monthly', 'quarterly', 'yearly'];
    const isPremium = premiumPlans.includes(status.plan.id);

    const featureMap = {
      'ai_coach_unlimited': status.limits.aiQueries === -1,
      'custom_meal_plans': isPremium,
      'health_rewards': isPremium,
      'priority_support': ['monthly', 'quarterly', 'yearly'].includes(status.plan.id),
      'advanced_analytics': isPremium,
      'unlimited_workouts': isPremium,
      'exclusive_content': ['quarterly', 'yearly'].includes(status.plan.id),
      'personal_trainer': status.plan.id === 'yearly'
    };

    return featureMap[feature] || false;
  }

  // Get usage statistics
  getUsageStats(user) {
    const status = this.getSubscriptionStatus(user);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Mock usage data - in production, track actual usage
    const usage = {
      aiQueries: {
        used: Math.floor(Math.random() * 50),
        limit: status.limits.aiQueries,
        unlimited: status.limits.aiQueries === -1
      },
      workoutPlans: {
        used: Math.floor(Math.random() * 10),
        limit: status.limits.workoutPlans,
        unlimited: status.limits.workoutPlans === -1
      },
      nutritionLogs: {
        used: Math.floor(Math.random() * 20),
        limit: status.limits.nutritionLogs,
        unlimited: status.limits.nutritionLogs === -1
      }
    };

    return usage;
  }

  // Check if money was actually deducted from user's account
  checkIfMoneyWasDeducted(session) {
    // In production, this would check with the payment gateway/bank
    // For demo purposes, simulate 30% chance that money was deducted even on failed payment
    const wasDeducted = Math.random() < 0.3;
    
    console.log(`Checking if money was deducted for payment ${session.paymentId}: ${wasDeducted}`);
    
    // Store this information in the session for tracking
    session.moneyDeducted = wasDeducted;
    session.deductionCheckTime = new Date();
    
    return wasDeducted;
  }

  // Initiate automatic refund for failed payments where money was deducted
  async initiateAutomaticRefund(session) {
    try {
      console.log(`Initiating automatic refund for payment ${session.paymentId}`);
      
      const refundId = this.generateRefundId();
      const refundAmount = session.amount;
      
      // In production, this would call the payment gateway's refund API
      const refundData = {
        refundId: refundId,
        originalPaymentId: session.paymentId,
        amount: refundAmount,
        reason: 'Automatic refund for failed payment where money was deducted',
        status: 'initiated',
        initiatedAt: new Date(),
        estimatedCompletionTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 business days
        refundMethod: 'UPI', // Same method as original payment
        gatewayRefundId: this.generateGatewayRefundId(),
        customerNotified: false
      };
      
      // Store refund information
      session.refund = refundData;
      
      // In production, you would:
      // 1. Call payment gateway refund API
      // 2. Send notification to user
      // 3. Update database with refund status
      // 4. Set up webhook to track refund completion
      
      console.log(`Automatic refund initiated: ${refundId} for amount ₹${refundAmount}`);
      
      // Simulate refund processing (in production, this would be handled by gateway webhooks)
      setTimeout(() => {
        this.processRefundCompletion(refundId, session);
      }, 5000); // Simulate 5 second processing time
      
      return {
        success: true,
        refundId: refundId,
        amount: refundAmount,
        status: 'initiated',
        estimatedDays: 5,
        message: `Automatic refund of ₹${refundAmount} has been initiated. You will receive the money back in 3-5 business days.`,
        trackingId: refundData.gatewayRefundId
      };
      
    } catch (error) {
      console.error('Automatic refund initiation error:', error);
      
      return {
        success: false,
        error: 'Failed to initiate automatic refund',
        message: 'There was an issue processing your automatic refund. Please contact customer support.',
        supportContact: 'support@fitwith.ai'
      };
    }
  }

  // Generate gateway refund ID (simulated)
  generateGatewayRefundId() {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `GW_REF_${timestamp}_${random}`;
  }

  // Process refund completion (simulated webhook)
  processRefundCompletion(refundId, session) {
    try {
      console.log(`Processing refund completion for ${refundId}`);
      
      if (session.refund) {
        session.refund.status = 'completed';
        session.refund.completedAt = new Date();
        session.refund.customerNotified = true;
        
        console.log(`Refund ${refundId} completed successfully. Amount ₹${session.refund.amount} credited back to customer.`);
        
        // In production, you would:
        // 1. Update database with completion status
        // 2. Send confirmation email/SMS to customer
        // 3. Update payment records
        // 4. Generate refund receipt
      }
      
    } catch (error) {
      console.error('Refund completion processing error:', error);
    }
  }

  // Get refund status for a payment
  getRefundStatus(paymentId) {
    const session = this.getPaymentSession(paymentId);
    
    if (!session || !session.refund) {
      return {
        hasRefund: false,
        message: 'No refund found for this payment'
      };
    }
    
    return {
      hasRefund: true,
      refund: {
        refundId: session.refund.refundId,
        amount: session.refund.amount,
        status: session.refund.status,
        initiatedAt: session.refund.initiatedAt,
        completedAt: session.refund.completedAt,
        estimatedCompletionTime: session.refund.estimatedCompletionTime,
        trackingId: session.refund.gatewayRefundId,
        reason: session.refund.reason
      }
    };
  }

  // Manual refund initiation (for customer support)
  async initiateManualRefund(paymentId, reason, amount = null) {
    try {
      const session = this.getPaymentSession(paymentId);
      
      if (!session) {
        throw new Error('Payment session not found');
      }
      
      const refundAmount = amount || session.amount;
      
     
      session.amount = refundAmount; // Override amount if partial refund
      const refundResult = await this.initiateAutomaticRefund(session);
      
      if (refundResult.success) {
        session.refund.reason = reason;
        session.refund.type = 'manual';
        session.refund.initiatedBy = 'customer_support';
      }
      
      return refundResult;
      
    } catch (error) {
      console.error('Manual refund initiation error:', error);
      throw new Error('Failed to initiate manual refund: ' + error.message);
    }
  }
}

module.exports = new PaymentService();