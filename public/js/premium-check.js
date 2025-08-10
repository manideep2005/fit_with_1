/**
 * Premium Feature Management System
 * Handles subscription checking, feature locking, and upgrade prompts
 */
class PremiumChecker {
  constructor() {
    this.subscriptionCache = null;
    this.cacheExpiry = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.premiumFeatures = {
      'ai-coach': {
        name: 'Advanced AI Coach',
        description: 'Get unlimited AI coaching sessions with personalized workout plans',
        icon: 'fas fa-robot',
        requiredPlan: 'basic'
      },
      'analytics': {
        name: 'Advanced Analytics',
        description: 'Detailed progress tracking, body composition analysis, and performance insights',
        icon: 'fas fa-chart-line',
        requiredPlan: 'basic'
      },
      'personal-trainer': {
        name: 'Personal Trainer AI',
        description: 'One-on-one AI personal trainer with real-time form correction',
        icon: 'fas fa-user-md',
        requiredPlan: 'premium'
      },
      'nutrition-advanced': {
        name: 'Advanced Nutrition Tracking',
        description: 'Macro tracking, meal planning, and nutritionist consultations',
        icon: 'fas fa-utensils',
        requiredPlan: 'basic'
      },
      'health-rewards': {
        name: 'Health Rewards Program',
        description: 'Earn points, unlock achievements, and get exclusive health benefits',
        icon: 'fas fa-gift',
        requiredPlan: 'premium'
      },
      'custom-workouts': {
        name: 'Custom Workout Plans',
        description: 'Personalized workout routines based on your goals and preferences',
        icon: 'fas fa-dumbbell',
        requiredPlan: 'basic'
      },
      'live-coaching': {
        name: 'Live Coaching Sessions',
        description: 'Real-time coaching sessions with certified trainers',
        icon: 'fas fa-video',
        requiredPlan: 'premium'
      },
      'meal-planning': {
        name: 'AI Meal Planning',
        description: 'Personalized meal plans with grocery lists and cooking instructions',
        icon: 'fas fa-calendar-alt',
        requiredPlan: 'basic'
      },
      'biometric-tracking': {
        name: 'Advanced Biometric Tracking',
        description: 'Heart rate monitoring, sleep tracking, and health insights',
        icon: 'fas fa-heartbeat',
        requiredPlan: 'premium'
      },
      'voice-assistant': {
        name: 'Voice Assistant Premium',
        description: 'Advanced voice commands and unlimited voice interactions',
        icon: 'fas fa-microphone',
        requiredPlan: 'basic'
      },
      'nutriscan': {
        name: 'NutriScan Premium',
        description: 'Advanced food scanning with detailed nutritional analysis',
        icon: 'fas fa-camera',
        requiredPlan: 'basic'
      },
      'community-premium': {
        name: 'Premium Community Features',
        description: 'Create groups, host challenges, and access exclusive content',
        icon: 'fas fa-users',
        requiredPlan: 'premium'
      }
    };
  }

  // Check subscription status with caching
  async checkSubscription() {
    try {
      // Return cached data if still valid
      if (this.subscriptionCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
        return this.subscriptionCache;
      }

      const response = await fetch('/api/payment/subscription/status');
      const data = await response.json();
      
      if (data.success) {
        this.subscriptionCache = data.subscription;
        this.cacheExpiry = Date.now() + this.cacheTimeout;
        return data.subscription;
      }
      
      return null;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return null;
    }
  }

  // Check if user has premium subscription
  async isPremium() {
    const subscription = await this.checkSubscription();
    return subscription && subscription.plan.id !== 'free' && subscription.isActive;
  }

  // Check if user has specific plan level
  async hasPlan(requiredPlan) {
    const subscription = await this.checkSubscription();
    if (!subscription || !subscription.isActive) return false;

    const planHierarchy = ['free', 'basic', 'premium', 'yearly'];
    const userPlanIndex = planHierarchy.indexOf(subscription.plan.id);
    const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);
    
    return userPlanIndex >= requiredPlanIndex;
  }

  // Check if user has access to specific feature
  async hasFeatureAccess(featureKey) {
    const feature = this.premiumFeatures[featureKey];
    if (!feature) return true; // If feature not defined, allow access
    
    return await this.hasPlan(feature.requiredPlan);
  }

  // Show upgrade modal with feature details
  showUpgradeModal(featureKey, customMessage = null) {
    const feature = this.premiumFeatures[featureKey] || {
      name: 'Premium Feature',
      description: 'This feature requires a premium subscription',
      icon: 'fas fa-crown',
      requiredPlan: 'premium'
    };

    const modal = document.createElement('div');
    modal.className = 'modal fade premium-upgrade-modal';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header border-0 text-center">
            <div class="w-100">
              <div class="premium-crown-icon mb-3">
                <i class="fas fa-crown" style="font-size: 3rem; color: #fbbf24;"></i>
              </div>
              <h4 class="modal-title">Unlock ${feature.name}</h4>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center px-4">
            <div class="feature-icon mb-3">
              <i class="${feature.icon}" style="font-size: 2.5rem; color: #6366f1;"></i>
            </div>
            <h5 class="mb-3">${feature.name}</h5>
            <p class="text-muted mb-4">${customMessage || feature.description}</p>
            
            <div class="premium-benefits mb-4">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <div class="benefit-item">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    <span>Unlimited Access</span>
                  </div>
                </div>
                <div class="col-md-6 mb-3">
                  <div class="benefit-item">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    <span>Priority Support</span>
                  </div>
                </div>
                <div class="col-md-6 mb-3">
                  <div class="benefit-item">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    <span>Advanced Features</span>
                  </div>
                </div>
                <div class="col-md-6 mb-3">
                  <div class="benefit-item">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    <span>No Ads</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="pricing-preview mb-4">
              <div class="row">
                <div class="col-md-6">
                  <div class="price-card">
                    <h6>Basic Pro</h6>
                    <div class="price">₹2<small>/month</small></div>
                    <small class="text-muted">Perfect for beginners</small>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="price-card popular">
                    <div class="popular-badge">Most Popular</div>
                    <h6>Premium Pro</h6>
                    <div class="price">₹5<small>/month</small></div>
                    <small class="text-muted">All features included</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer border-0 justify-content-center">
            <button type="button" class="btn btn-outline-secondary me-2" data-bs-dismiss="modal">
              Maybe Later
            </button>
            <button type="button" class="btn btn-primary btn-lg" onclick="window.location.href='/subscription'">
              <i class="fas fa-crown me-2"></i>Upgrade Now
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add custom styles
    const style = document.createElement('style');
    style.textContent = `
      .premium-upgrade-modal .modal-content {
        border-radius: 20px;
        border: none;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      }
      .premium-upgrade-modal .benefit-item {
        text-align: left;
        font-size: 0.9rem;
      }
      .premium-upgrade-modal .price-card {
        background: #f8fafc;
        border-radius: 12px;
        padding: 1rem;
        margin: 0.5rem 0;
        position: relative;
      }
      .premium-upgrade-modal .price-card.popular {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
      }
      .premium-upgrade-modal .popular-badge {
        position: absolute;
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
        background: #fbbf24;
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.7rem;
        font-weight: 600;
      }
      .premium-upgrade-modal .price {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0.5rem 0;
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => {
      modal.remove();
      style.remove();
    });

    // Track upgrade modal views
    this.trackEvent('upgrade_modal_shown', { feature: featureKey });
  }

  // Lock feature with visual indicators (DISABLED)
  async lockFeature(element, featureKey, options = {}) {
    // All features are now free - no locking
    return true;
  }

  // Add premium badge to element
  addPremiumBadge(element, feature) {
    const badge = document.createElement('div');
    badge.className = 'premium-badge';
    badge.innerHTML = `
      <i class="fas fa-crown"></i>
      <span>Premium</span>
    `;
    
    const badgeStyles = `
      .premium-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.7rem;
        font-weight: 600;
        z-index: 11;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      .premium-badge i {
        margin-right: 2px;
        font-size: 0.6rem;
      }
    `;
    
    if (!document.getElementById('premium-badge-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'premium-badge-styles';
      styleElement.textContent = badgeStyles;
      document.head.appendChild(styleElement);
    }
    
    element.appendChild(badge);
  }

  // Show usage limit modal
  showUsageLimitModal(feature, currentUsage, limit) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-exclamation-triangle text-warning me-2"></i>
              Usage Limit Reached
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center">
            <div class="mb-3">
              <div class="usage-meter" style="background: #e5e7eb; border-radius: 10px; height: 10px; overflow: hidden;">
                <div class="usage-bar" style="background: linear-gradient(90deg, #6366f1, #8b5cf6); height: 100%; width: ${(currentUsage/limit)*100}%; transition: width 0.3s ease;"></div>
              </div>
              <p class="mt-2">${currentUsage}/${limit} ${feature} used this month</p>
            </div>
            <h6>Upgrade for unlimited access</h6>
            <p class="text-muted">Get unlimited ${feature.toLowerCase()} and access to all premium features.</p>
          </div>
          <div class="modal-footer justify-content-center">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" onclick="window.location.href='/subscription'">
              <i class="fas fa-crown me-2"></i>Upgrade Now
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => {
      modal.remove();
    });
  }

  // Track events for analytics
  trackEvent(eventName, data = {}) {
    try {
      // Send to analytics if available
      if (typeof gtag !== 'undefined') {
        gtag('event', eventName, data);
      }
      
      // Log for debugging
      console.log('Premium Event:', eventName, data);
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  // Initialize premium features on page load
  async initializePage() {
    // Disabled premium locking - all features are now free
    console.log('Premium checking disabled - all features available');
    
    // Update UI based on subscription status
    await this.updateSubscriptionUI();
  }

  // Update UI elements based on subscription
  async updateSubscriptionUI() {
    const subscription = await this.checkSubscription();
    const isPremium = subscription && subscription.plan.id !== 'free' && subscription.isActive;
    
    // Update plan badges in navigation
    const planBadges = document.querySelectorAll('.user-plan');
    planBadges.forEach(badge => {
      if (subscription && subscription.plan) {
        badge.textContent = subscription.plan.name;
        badge.className = `user-plan ${isPremium ? 'premium' : 'free'}`;
      }
    });

    // Show/hide premium-only sections
    const premiumSections = document.querySelectorAll('.premium-only');
    premiumSections.forEach(section => {
      section.style.display = isPremium ? 'block' : 'none';
    });

    // Show/hide free-only sections
    const freeSections = document.querySelectorAll('.free-only');
    freeSections.forEach(section => {
      section.style.display = isPremium ? 'none' : 'block';
    });
  }

  // Static methods for backward compatibility
  static async checkSubscription() {
    return await window.premiumChecker.checkSubscription();
  }

  static async isPremium() {
    return await window.premiumChecker.isPremium();
  }

  static showUpgradeModal(feature) {
    return window.premiumChecker.showUpgradeModal(feature);
  }

  static async lockFeature(element, feature) {
    return await window.premiumChecker.lockFeature(element, feature);
  }
}

// Create global instance
const premiumChecker = new PremiumChecker();

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  premiumChecker.initializePage();
});

// Export for global access
window.PremiumChecker = PremiumChecker;
window.premiumChecker = premiumChecker;