/**
 * Subscription Detector
 * Ensures proper detection of premium status after payment
 */

class SubscriptionDetector {
  constructor() {
    this.checkInterval = null;
    this.maxChecks = 30; // Maximum number of checks
    this.checkCount = 0;
    this.checkDelay = 2000; // 2 seconds between checks
  }

  // Start monitoring subscription status after payment
  startMonitoring(paymentId) {
    console.log(`🔍 Starting subscription monitoring for payment: ${paymentId}`);
    
    this.checkCount = 0;
    this.paymentId = paymentId;
    
    // Clear any existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    // Start checking subscription status
    this.checkInterval = setInterval(() => {
      this.checkSubscriptionStatus();
    }, this.checkDelay);
    
    // Also check immediately
    this.checkSubscriptionStatus();
  }

  // Check subscription status
  async checkSubscriptionStatus() {
    try {
      this.checkCount++;
      
      console.log(`📊 Checking subscription status (attempt ${this.checkCount}/${this.maxChecks})`);
      
      const response = await fetch('/api/payment/subscription/check');
      const data = await response.json();
      
      if (data.success) {
        const subscription = data.subscription;
        
        console.log('📈 Subscription status:', {
          plan: subscription.plan.id,
          status: subscription.status,
          isPremium: subscription.isPremium,
          isActive: subscription.isActive
        });
        
        // Check if user is now premium
        if (subscription.isPremium && subscription.isActive) {
          console.log('🎉 Premium subscription detected!');
          this.onPremiumDetected(subscription);
          return;
        }
        
        // Check if we've reached max attempts
        if (this.checkCount >= this.maxChecks) {
          console.log('⏰ Max subscription checks reached');
          this.onMaxAttemptsReached();
          return;
        }
        
      } else {
        console.error('❌ Failed to check subscription status:', data.error);
      }
      
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
    }
  }

  // Called when premium subscription is detected
  onPremiumDetected(subscription) {
    // Stop monitoring
    this.stopMonitoring();
    
    // Show success message
    this.showSuccessMessage(subscription);
    
    // Update UI to reflect premium status
    this.updateUIForPremium(subscription);
    
    // Refresh premium features
    this.refreshPremiumFeatures();
    
    // Trigger custom event
    window.dispatchEvent(new CustomEvent('premiumActivated', {
      detail: { subscription }
    }));
  }

  // Called when max attempts reached without detecting premium
  onMaxAttemptsReached() {
    this.stopMonitoring();
    
    // Show message to refresh manually
    this.showManualRefreshMessage();
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('🛑 Subscription monitoring stopped');
  }

  // Show success message
  showSuccessMessage(subscription) {
    const message = `🎉 Premium subscription activated successfully! You now have access to all ${subscription.plan.name} features.`;
    
    this.showToast(message, 'success');
    
    // Also show a more detailed modal
    this.showPremiumWelcomeModal(subscription);
  }

  // Show manual refresh message
  showManualRefreshMessage() {
    const message = 'Payment processed! If you don\'t see premium features, please refresh the page.';
    
    this.showToast(message, 'info');
    
    // Add refresh button
    setTimeout(() => {
      const refreshBtn = document.createElement('button');
      refreshBtn.textContent = 'Refresh Page';
      refreshBtn.className = 'btn btn-primary';
      refreshBtn.onclick = () => window.location.reload();
      
      const container = document.querySelector('.subscription-status') || document.body;
      container.appendChild(refreshBtn);
    }, 3000);
  }

  // Update UI for premium status
  updateUIForPremium(subscription) {
    // Update plan badges
    const planBadges = document.querySelectorAll('.user-plan');
    planBadges.forEach(badge => {
      badge.textContent = subscription.plan.name;
      badge.className = 'user-plan premium';
    });

    // Remove premium locks
    const premiumLocks = document.querySelectorAll('.premium-lock-overlay');
    premiumLocks.forEach(lock => {
      lock.style.display = 'none';
    });

    // Update navigation if present
    const premiumLinks = document.querySelectorAll('[data-premium]');
    premiumLinks.forEach(link => {
      link.style.opacity = '1';
      link.style.pointerEvents = 'auto';
    });

    console.log('✅ UI updated for premium status');
  }

  // Refresh premium features
  refreshPremiumFeatures() {
    // Clear premium checker cache
    if (window.premiumChecker) {
      window.premiumChecker.subscriptionCache = null;
      window.premiumChecker.cacheExpiry = null;
    }

    // Re-initialize premium features
    if (window.premiumChecker && window.premiumChecker.initializePage) {
      window.premiumChecker.initializePage();
    }

    console.log('🔄 Premium features refreshed');
  }

  // Show premium welcome modal
  showPremiumWelcomeModal(subscription) {
    const modal = document.createElement('div');
    modal.className = 'modal fade premium-welcome-modal';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header border-0 text-center">
            <div class="w-100">
              <div class="premium-crown-icon mb-3">
                <i class="fas fa-crown" style="font-size: 4rem; color: #fbbf24;"></i>
              </div>
              <h3 class="modal-title">Welcome to ${subscription.plan.name}!</h3>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center px-4">
            <h5 class="mb-3">🎉 Your premium subscription is now active!</h5>
            <p class="text-muted mb-4">You now have access to all premium features:</p>
            
            <div class="premium-features mb-4">
              <div class="row">
                ${subscription.features.map(feature => `
                  <div class="col-md-6 mb-2">
                    <div class="feature-item text-start">
                      <i class="fas fa-check-circle text-success me-2"></i>
                      <span>${feature}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="subscription-details mb-4">
              <div class="row">
                <div class="col-md-6">
                  <div class="detail-card">
                    <h6>Plan</h6>
                    <p>${subscription.plan.name}</p>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="detail-card">
                    <h6>Valid Until</h6>
                    <p>${subscription.daysRemaining ? `${subscription.daysRemaining} days` : 'Active'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer border-0 justify-content-center">
            <button type="button" class="btn btn-primary btn-lg" data-bs-dismiss="modal">
              <i class="fas fa-rocket me-2"></i>Start Using Premium Features
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add custom styles
    const style = document.createElement('style');
    style.textContent = `
      .premium-welcome-modal .modal-content {
        border-radius: 20px;
        border: none;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      }
      .premium-welcome-modal .feature-item {
        font-size: 0.9rem;
        margin-bottom: 0.5rem;
      }
      .premium-welcome-modal .detail-card {
        background: #f8fafc;
        border-radius: 12px;
        padding: 1rem;
        margin: 0.5rem 0;
      }
      .premium-welcome-modal .detail-card h6 {
        margin-bottom: 0.5rem;
        color: #6b7280;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .premium-welcome-modal .detail-card p {
        margin: 0;
        font-weight: 600;
        color: #1f2937;
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
  }

  // Show toast notification
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-triangle' : 
                 type === 'warning' ? 'exclamation-circle' : 'info-circle';
    
    toast.innerHTML = `<i class="fas fa-${icon}"></i>${message}`;
    
    // Add toast styles if not present
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        .toast-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 15px 20px;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          z-index: 10000;
          transform: translateX(400px);
          transition: transform 0.3s ease;
          min-width: 300px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .toast-notification.show {
          transform: translateX(0);
        }
        .toast-success {
          background: linear-gradient(135deg, #28a745, #20c997);
        }
        .toast-error {
          background: linear-gradient(135deg, #dc3545, #fd7e14);
        }
        .toast-info {
          background: linear-gradient(135deg, #17a2b8, #6f42c1);
        }
        .toast-warning {
          background: linear-gradient(135deg, #ffc107, #fd7e14);
        }
        .toast-notification i {
          margin-right: 10px;
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 5000);
  }

  // Force refresh subscription status
  async forceRefresh() {
    try {
      console.log('🔄 Force refreshing subscription status...');
      
      const response = await fetch('/api/payment/subscription/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Subscription status refreshed');
        this.showToast('Subscription status updated!', 'success');
        
        // Reload page to reflect changes
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        console.error('❌ Failed to refresh subscription status');
        this.showToast('Failed to refresh subscription status', 'error');
      }
      
    } catch (error) {
      console.error('❌ Error refreshing subscription:', error);
      this.showToast('Error refreshing subscription status', 'error');
    }
  }
}

// Create global instance
window.subscriptionDetector = new SubscriptionDetector();

// Auto-start monitoring if payment ID is in URL
document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const paymentId = urlParams.get('paymentId');
  
  if (paymentId) {
    console.log('🔍 Payment ID found in URL, starting subscription monitoring');
    window.subscriptionDetector.startMonitoring(paymentId);
  }
});

// Export for use in other scripts
window.SubscriptionDetector = SubscriptionDetector;