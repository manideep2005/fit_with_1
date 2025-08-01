// Premium feature checking utility
class PremiumChecker {
  static async checkSubscription() {
    try {
      const response = await fetch('/api/payment/subscription/status');
      const data = await response.json();
      return data.success ? data.subscription : null;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return null;
    }
  }

  static async isPremium() {
    const subscription = await this.checkSubscription();
    return subscription && subscription.plan.id !== 'free' && subscription.isActive;
  }

  static showUpgradeModal(feature) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-crown text-warning me-2"></i>
              Premium Feature
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center">
            <div class="mb-3">
              <i class="fas fa-lock" style="font-size: 3rem; color: #fbbf24;"></i>
            </div>
            <h6>Unlock ${feature}</h6>
            <p class="text-muted">This feature requires a premium subscription to access.</p>
          </div>
          <div class="modal-footer justify-content-center">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
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

  static async lockFeature(element, feature) {
    const isPremium = await this.isPremium();
    
    if (!isPremium) {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showUpgradeModal(feature);
      });
      
      // Add visual lock indicator
      element.style.position = 'relative';
      const lockIcon = document.createElement('div');
      lockIcon.innerHTML = '<i class="fas fa-lock"></i>';
      lockIcon.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(251, 191, 36, 0.9);
        color: white;
        padding: 5px 8px;
        border-radius: 50%;
        font-size: 12px;
        z-index: 10;
      `;
      element.appendChild(lockIcon);
      
      // Add opacity to locked elements
      element.style.opacity = '0.7';
    }
  }
}

// Auto-lock premium features on page load
document.addEventListener('DOMContentLoaded', function() {
  // Lock AI Coach advanced features
  const aiCoachAdvanced = document.querySelectorAll('[data-premium="ai-coach"]');
  aiCoachAdvanced.forEach(el => {
    PremiumChecker.lockFeature(el, 'Advanced AI Coach');
  });
  
  // Lock advanced analytics
  const analytics = document.querySelectorAll('[data-premium="analytics"]');
  analytics.forEach(el => {
    PremiumChecker.lockFeature(el, 'Advanced Analytics');
  });
  
  // Lock personal trainer AI
  const personalTrainer = document.querySelectorAll('[data-premium="personal-trainer"]');
  personalTrainer.forEach(el => {
    PremiumChecker.lockFeature(el, 'Personal Trainer AI');
  });
});

window.PremiumChecker = PremiumChecker;