// Firebase admin removed for deployment simplicity - using fallback implementation

class NotificationService {
  constructor() {
    this.isFirebaseEnabled = false;
    console.log('📱 Notification Service initialized (Firebase disabled)');
  }

  async sendNotification(userToken, title, body, data = {}) {
    try {
      // Fallback implementation - log notification instead of sending
      console.log('📨 Notification (simulated):', {
        to: userToken,
        title,
        body,
        data,
        timestamp: new Date().toISOString()
      });
      
      return { 
        success: true, 
        response: 'Notification logged (Firebase disabled)',
        simulated: true
      };
    } catch (error) {
      console.error('Notification error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendToMultiple(tokens, title, body, data = {}) {
    try {
      // Fallback implementation - log notifications instead of sending
      console.log('📨 Bulk Notification (simulated):', {
        to: `${tokens.length} recipients`,
        title,
        body,
        data,
        timestamp: new Date().toISOString()
      });
      
      return { 
        success: true, 
        response: `${tokens.length} notifications logged (Firebase disabled)`,
        simulated: true
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();