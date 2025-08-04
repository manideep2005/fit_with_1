/**
 * Subscription Manager Service
 * Handles subscription activation, verification, and status management
 */

const UserService = require('./userService');

class SubscriptionManager {
  constructor() {
    this.planHierarchy = ['free', 'basic', 'premium', 'yearly'];
    this.featureLimits = {
      free: {
        ai_chat: 10,
        meal_planning: 5,
        voice_assistant: 20,
        nutriscan: 10,
        analytics: 3
      },
      basic: {
        ai_chat: -1, // unlimited
        meal_planning: -1,
        voice_assistant: -1,
        nutriscan: -1,
        analytics: -1
      },
      premium: {
        ai_chat: -1,
        meal_planning: -1,
        voice_assistant: -1,
        nutriscan: -1,
        analytics: -1,
        personal_trainer: -1,
        health_rewards: -1,
        live_coaching: -1
      }
    };
  }

  // Activate subscription after successful payment
  async activateSubscription(userEmail, planId, paymentDetails) {
    try {
      console.log(`🔄 Activating subscription for ${userEmail}, plan: ${planId}`);
      
      const user = await UserService.getUserByEmail(userEmail);
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate subscription dates
      const now = new Date();
      const endDate = this.calculateEndDate(planId);
      
      // Create subscription data
      const subscriptionData = {
        plan: planId,
        status: 'active',
        startDate: now,
        endDate: endDate,
        isActive: true,
        autoRenew: true,
        paymentMethod: paymentDetails.paymentMethod || 'UPI',
        lastPayment: {
          date: now,
          amount: paymentDetails.amount,
          transactionId: paymentDetails.transactionId,
          paymentId: paymentDetails.paymentId,
          status: 'completed'
        },
        paymentHistory: [
          ...(user.subscription?.paymentHistory || []),
          {
            date: now,
            amount: paymentDetails.amount,
            plan: planId,
            transactionId: paymentDetails.transactionId,
            paymentId: paymentDetails.paymentId,
            status: 'completed',
            gateway: paymentDetails.gateway || 'RAZORPAY'
          }
        ]
      };

      // Update user subscription in database
      await UserService.updateSubscription(userEmail, subscriptionData);
      
      console.log(`✅ Subscription activated successfully for ${userEmail}`);
      
      // Reset monthly usage since user is now premium
      await this.resetUsageForNewSubscription(userEmail);
      
      return {
        success: true,
        subscription: subscriptionData,
        message: `${planId} subscription activated successfully!`,
        activatedAt: now,
        validUntil: endDate
      };

    } catch (error) {
      console.error('❌ Subscription activation error:', error);
      throw new Error('Failed to activate subscription: ' + error.message);
    }
  }

  // Calculate subscription end date based on plan
  calculateEndDate(planId) {
    const now = new Date();
    const endDate = new Date(now);

    switch (planId.toLowerCase()) {
      case 'weekly':
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'monthly':
      case 'basic':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
      case 'premium':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        // Default to monthly
        endDate.setMonth(endDate.getMonth() + 1);
    }

    return endDate;
  }

  // Check if user has active premium subscription
  async isPremiumUser(userEmail) {
    try {
      const user = await UserService.getUserByEmail(userEmail);
      if (!user) return false;

      const subscription = user.subscription;
      if (!subscription) return false;

      // Check if subscription is active
      if (subscription.status !== 'active') return false;

      // Check if plan is premium
      if (subscription.plan === 'free') return false;

      // Check if subscription hasn't expired
      if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
        // Subscription expired, update status
        await this.expireSubscription(userEmail);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  }

  // Get detailed subscription status
  async getSubscriptionStatus(userEmail) {
    try {
      const user = await UserService.getUserByEmail(userEmail);
      if (!user) {
        throw new Error('User not found');
      }

      const subscription = user.subscription || { plan: 'free', status: 'active' };
      const isPremium = await this.isPremiumUser(userEmail);
      
      let daysRemaining = null;
      let isExpired = false;
      
      if (subscription.endDate) {
        const endDate = new Date(subscription.endDate);
        const now = new Date();
        daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        isExpired = daysRemaining <= 0;
      }

      // Auto-expire if needed
      if (isExpired && subscription.status === 'active') {
        await this.expireSubscription(userEmail);
        subscription.status = 'expired';
      }

      return {
        plan: subscription.plan || 'free',
        status: subscription.status || 'active',
        isPremium: isPremium,
        isActive: subscription.status === 'active' && !isExpired,
        isExpired: isExpired,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        daysRemaining: daysRemaining,
        autoRenew: subscription.autoRenew || false,
        lastPayment: subscription.lastPayment,
        paymentHistory: subscription.paymentHistory || [],
        features: this.getPlanFeatures(subscription.plan || 'free')
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      throw error;
    }
  }

  // Get plan features
  getPlanFeatures(planId) {
    const features = {
      free: [
        'Basic workouts',
        'Limited AI coach (10 queries/month)',
        'Basic nutrition tracking',
        'Progress tracking'
      ],
      basic: [
        'Unlimited AI coach',
        'Advanced nutrition tracking',
        'Custom meal plans',
        'Voice assistant premium',
        'Advanced analytics',
        'Priority support'
      ],
      premium: [
        'All Basic features',
        'Personal trainer AI',
        'Health rewards program',
        'Live coaching sessions',
        'Advanced biometric tracking',
        'Community premium features',
        'Exclusive content'
      ]
    };

    return features[planId] || features.free;
  }

  // Check feature access
  async hasFeatureAccess(userEmail, feature) {
    try {
      const status = await this.getSubscriptionStatus(userEmail);
      
      if (!status.isActive) {
        return { hasAccess: false, reason: 'No active subscription' };
      }

      const plan = status.plan;
      const limits = this.featureLimits[plan] || this.featureLimits.free;

      // Check if feature is available for this plan
      if (limits[feature] === undefined) {
        return { hasAccess: true, reason: 'Feature not restricted' };
      }

      // Unlimited access
      if (limits[feature] === -1) {
        return { hasAccess: true, reason: 'Unlimited access' };
      }

      // Check usage limits for free users
      if (plan === 'free') {
        const usage = await UserService.getUserUsage(userEmail);
        const currentUsage = usage[feature] || 0;
        const limit = limits[feature];

        if (currentUsage >= limit) {
          return { 
            hasAccess: false, 
            reason: 'Usage limit reached',
            usage: currentUsage,
            limit: limit
          };
        }

        return { 
          hasAccess: true, 
          reason: 'Within usage limit',
          usage: currentUsage,
          limit: limit,
          remaining: limit - currentUsage
        };
      }

      return { hasAccess: true, reason: 'Premium access' };

    } catch (error) {
      console.error('Error checking feature access:', error);
      return { hasAccess: false, reason: 'Error checking access' };
    }
  }

  // Expire subscription
  async expireSubscription(userEmail) {
    try {
      console.log(`⏰ Expiring subscription for ${userEmail}`);
      
      const user = await UserService.getUserByEmail(userEmail);
      if (!user || !user.subscription) return;

      const expiredSubscription = {
        ...user.subscription,
        status: 'expired',
        expiredAt: new Date(),
        isActive: false
      };

      await UserService.updateSubscription(userEmail, expiredSubscription);
      
      console.log(`✅ Subscription expired for ${userEmail}`);
      
      return { success: true, message: 'Subscription expired' };
    } catch (error) {
      console.error('Error expiring subscription:', error);
      throw error;
    }
  }

  // Reset usage for new subscription
  async resetUsageForNewSubscription(userEmail) {
    try {
      // Reset current month usage since user is now premium
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthKey = `${currentYear}-${currentMonth}`;

      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const collection = db.collection('users');

      await collection.updateOne(
        { email: userEmail.toLowerCase().trim() },
        { $unset: { [`usage.${monthKey}`]: "" } }
      );

      console.log(`🔄 Usage reset for new premium subscriber: ${userEmail}`);
    } catch (error) {
      console.error('Error resetting usage:', error);
      // Don't throw error as this is not critical
    }
  }

  // Verify payment and activate subscription
  async verifyAndActivateSubscription(userEmail, paymentId, verificationCode) {
    try {
      console.log(`🔍 Verifying payment ${paymentId} for ${userEmail}`);
      
      const paymentService = require('./paymentService');
      
      // Verify payment
      const verificationResult = await paymentService.verifyPayment(paymentId, verificationCode);
      
      if (!verificationResult.success) {
        console.log(`❌ Payment verification failed for ${paymentId}`);
        return verificationResult;
      }

      console.log(`✅ Payment verified for ${paymentId}, activating subscription...`);

      // Activate subscription
      const activationResult = await this.activateSubscription(userEmail, verificationResult.planId, {
        amount: verificationResult.amount,
        transactionId: verificationResult.transactionId,
        paymentId: verificationResult.paymentId,
        paymentMethod: 'UPI',
        gateway: 'RAZORPAY'
      });

      if (activationResult.success) {
        console.log(`🎉 Subscription activated successfully for ${userEmail}`);
        
        return {
          success: true,
          message: 'Payment verified and subscription activated!',
          subscription: activationResult.subscription,
          paymentDetails: verificationResult
        };
      } else {
        throw new Error('Failed to activate subscription after payment verification');
      }

    } catch (error) {
      console.error('❌ Error in verify and activate:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Force refresh subscription status (for debugging)
  async refreshSubscriptionStatus(userEmail) {
    try {
      console.log(`🔄 Refreshing subscription status for ${userEmail}`);
      
      const user = await UserService.getUserByEmail(userEmail);
      if (!user) {
        throw new Error('User not found');
      }

      // Get fresh subscription status
      const status = await this.getSubscriptionStatus(userEmail);
      
      console.log(`📊 Current subscription status for ${userEmail}:`, {
        plan: status.plan,
        status: status.status,
        isPremium: status.isPremium,
        isActive: status.isActive,
        daysRemaining: status.daysRemaining
      });

      return status;
    } catch (error) {
      console.error('Error refreshing subscription status:', error);
      throw error;
    }
  }

  // Get subscription analytics
  async getSubscriptionAnalytics(userEmail) {
    try {
      const status = await this.getSubscriptionStatus(userEmail);
      const usage = await UserService.getUserUsage(userEmail);

      return {
        subscription: status,
        usage: usage,
        recommendations: this.getUpgradeRecommendations(status, usage),
        savings: this.calculatePotentialSavings(status.plan)
      };
    } catch (error) {
      console.error('Error getting subscription analytics:', error);
      throw error;
    }
  }

  // Get upgrade recommendations
  getUpgradeRecommendations(status, usage) {
    if (status.isPremium) {
      return {
        shouldUpgrade: false,
        message: 'You have premium access to all features!'
      };
    }

    const recommendations = [];
    
    // Check if user is hitting limits
    Object.keys(usage).forEach(feature => {
      const limit = this.featureLimits.free[feature];
      if (limit && limit > 0 && usage[feature] >= limit * 0.8) {
        recommendations.push({
          feature: feature,
          usage: usage[feature],
          limit: limit,
          message: `You're using ${usage[feature]}/${limit} ${feature} queries. Upgrade for unlimited access!`
        });
      }
    });

    return {
      shouldUpgrade: recommendations.length > 0,
      recommendations: recommendations,
      message: recommendations.length > 0 ? 
        'Consider upgrading to premium for unlimited access!' : 
        'You\'re within your usage limits.'
    };
  }

  // Calculate potential savings
  calculatePotentialSavings(currentPlan) {
    const savings = {
      yearly: {
        monthly: 'Save ₹24 per year',
        quarterly: 'Save ₹12 per year'
      }
    };

    return savings[currentPlan] || null;
  }
}

module.exports = new SubscriptionManager();
  // Get plan display name
  getPlanDisplayName(planId) {
    const names = {
      "weekly": "Premium Weekly",
      "monthly": "Premium Monthly", 
      "quarterly": "Premium Quarterly",
      "yearly": "Premium Yearly",
      "basic": "Basic Pro",
      "premium": "Premium Pro"
    };
    return names[planId] || "Premium Plan";
  }

  // Get plan duration
  getPlanDuration(planId) {
    const durations = {
      "weekly": "weekly",
      "monthly": "monthly",
      "quarterly": "quarterly", 
      "yearly": "yearly",
      "basic": "monthly",
      "premium": "yearly"
    };
    return durations[planId] || "monthly";
  }

  // Send payment confirmation with PDF
  async sendPaymentConfirmation(userEmail, paymentDetails, subscriptionDetails) {
    try {
      const paymentConfirmationService = require("./paymentConfirmationService");
      const user = await UserService.getUserByEmail(userEmail);
      
      const result = await paymentConfirmationService.createSuccessPage(
        paymentDetails,
        subscriptionDetails,
        {
          _id: user._id,
          fullName: user.fullName,
          email: user.email
        }
      );

      return result;
    } catch (error) {
      console.error("❌ Error sending payment confirmation:", error);
      return { success: false, error: error.message };
    }
  }

