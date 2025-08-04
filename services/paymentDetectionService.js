const crypto = require('crypto');

class PaymentDetectionService {
  constructor() {
    this.pendingPayments = new Map();
    this.completedPayments = new Map();
  }

  // Store payment for detection
  storePaymentForDetection(paymentId, amount, upiId = '8885800887@ptaxis') {
    this.pendingPayments.set(paymentId, {
      paymentId,
      amount,
      upiId,
      createdAt: new Date(),
      status: 'pending'
    });
    
    console.log(`Payment stored for detection: ${paymentId} - ₹${amount}`);
    return true;
  }

  // Simulate payment detection (in real scenario, this would be a webhook from payment gateway)
  async detectPayment(paymentId) {
    const payment = this.pendingPayments.get(paymentId);
    if (!payment) {
      return { detected: false, reason: 'Payment not found' };
    }

    const timeSinceCreation = Date.now() - payment.createdAt.getTime();
    
    // Simulate realistic payment detection
    // In real scenario, this would check with bank/UPI gateway
    if (timeSinceCreation > 30000) { // 30 seconds minimum
      // 85% success rate for realistic simulation
      const isDetected = Math.random() > 0.15;
      
      if (isDetected) {
        // Mark as completed
        this.completedPayments.set(paymentId, {
          ...payment,
          status: 'completed',
          completedAt: new Date(),
          transactionId: this.generateTransactionId()
        });
        
        this.pendingPayments.delete(paymentId);
        
        console.log(`Payment detected: ${paymentId} - ₹${payment.amount}`);
        
        return {
          detected: true,
          payment: this.completedPayments.get(paymentId)
        };
      }
    }
    
    return { detected: false, reason: 'Payment not yet detected' };
  }

  // Check if payment was actually made (for manual verification)
  async verifyPaymentManually(paymentId, userConfirmation = false) {
    const payment = this.pendingPayments.get(paymentId) || this.completedPayments.get(paymentId);
    
    if (!payment) {
      return { verified: false, reason: 'Payment session not found' };
    }

    // If already completed, return success
    if (this.completedPayments.has(paymentId)) {
      return {
        verified: true,
        payment: this.completedPayments.get(paymentId)
      };
    }

    const timeSinceCreation = Date.now() - payment.createdAt.getTime();
    
    // Must wait at least 15 seconds
    if (timeSinceCreation < 15000) {
      return { 
        verified: false, 
        reason: 'Please wait at least 15 seconds after payment creation' 
      };
    }

    // If user confirms and enough time has passed, verify
    if (userConfirmation && timeSinceCreation > 30000) {
      // Move to completed
      this.completedPayments.set(paymentId, {
        ...payment,
        status: 'completed',
        completedAt: new Date(),
        transactionId: this.generateTransactionId(),
        verifiedManually: true
      });
      
      this.pendingPayments.delete(paymentId);
      
      console.log(`Payment manually verified: ${paymentId} - ₹${payment.amount}`);
      
      return {
        verified: true,
        payment: this.completedPayments.get(paymentId)
      };
    }

    return { 
      verified: false, 
      reason: 'Payment verification failed. Please ensure you have completed the UPI payment.' 
    };
  }

  // Generate transaction ID
  generateTransactionId() {
    return 'TXN_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  // Get payment status
  getPaymentStatus(paymentId) {
    if (this.completedPayments.has(paymentId)) {
      return {
        status: 'completed',
        payment: this.completedPayments.get(paymentId)
      };
    }
    
    if (this.pendingPayments.has(paymentId)) {
      return {
        status: 'pending',
        payment: this.pendingPayments.get(paymentId)
      };
    }
    
    return {
      status: 'not_found',
      payment: null
    };
  }

  // Webhook endpoint for real payment notifications (future implementation)
  async handlePaymentWebhook(webhookData) {
    // This would be called by actual payment gateway
    const { paymentId, status, amount, transactionId } = webhookData;
    
    if (status === 'success' && this.pendingPayments.has(paymentId)) {
      this.completedPayments.set(paymentId, {
        ...this.pendingPayments.get(paymentId),
        status: 'completed',
        completedAt: new Date(),
        transactionId: transactionId,
        webhookVerified: true
      });
      
      this.pendingPayments.delete(paymentId);
      
      console.log(`Payment webhook processed: ${paymentId} - ₹${amount}`);
      return { success: true };
    }
    
    return { success: false, reason: 'Payment not found or invalid status' };
  }
}

module.exports = new PaymentDetectionService();