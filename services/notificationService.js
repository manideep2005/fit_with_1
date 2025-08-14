const admin = require('firebase-admin');

class NotificationService {
  constructor() {
    if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
        console.log('✅ Firebase Admin initialized');
      } catch (error) {
        console.error('❌ Firebase Admin init failed:', error.message);
      }
    }
  }

  async sendNotification(userToken, title, body, data = {}) {
    try {
      const message = {
        notification: { title, body },
        data,
        token: userToken,
      };

      const response = await admin.messaging().send(message);
      console.log('Notification sent:', response);
      return { success: true, response };
    } catch (error) {
      console.error('Notification error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendToMultiple(tokens, title, body, data = {}) {
    try {
      const message = {
        notification: { title, body },
        data,
        tokens,
      };

      const response = await admin.messaging().sendMulticast(message);
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();