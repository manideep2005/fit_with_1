/**
 * Payment Confirmation Service
 * Handles payment success page, confirmation emails, and PDF receipt generation
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PaymentConfirmationService {
  constructor() {
    this.emailService = require('./emailService');
  }

  // Generate payment success page data
  generateSuccessPageData(paymentDetails, subscriptionDetails, userDetails) {
    const successData = {
      payment: {
        transactionId: paymentDetails.transactionId,
        paymentId: paymentDetails.paymentId,
        amount: paymentDetails.amount,
        currency: 'INR',
        paymentMethod: paymentDetails.paymentMethod || 'UPI',
        gateway: paymentDetails.gateway || 'RAZORPAY',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        formattedDate: new Date().toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      },
      subscription: {
        plan: subscriptionDetails.plan,
        planName: subscriptionDetails.planName,
        duration: subscriptionDetails.duration,
        features: subscriptionDetails.features,
        startDate: subscriptionDetails.startDate,
        endDate: subscriptionDetails.endDate,
        status: 'ACTIVE'
      },
      user: {
        name: userDetails.fullName,
        email: userDetails.email,
        userId: userDetails._id
      },
      confirmation: {
        confirmationNumber: this.generateConfirmationNumber(),
        supportEmail: 'support@fitwith.ai',
        supportPhone: '+91-8885800887'
      }
    };

    return successData;
  }

  // Generate confirmation number
  generateConfirmationNumber() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `FWA-${timestamp.slice(-6)}-${random}`;
  }

  // Generate PDF receipt
  async generatePDFReceipt(successData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        // Collect PDF data
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        // Header with logo and company info
        this.addHeader(doc);
        
        // Payment confirmation title
        doc.fontSize(24)
           .fillColor('#28a745')
           .text('Payment Confirmation', 50, 150, { align: 'center' });

        doc.fontSize(16)
           .fillColor('#6c757d')
           .text('Thank you for your subscription!', 50, 180, { align: 'center' });

        // Confirmation details box
        this.addConfirmationBox(doc, successData, 220);

        // Payment details section
        this.addPaymentDetails(doc, successData, 320);

        // Subscription details section
        this.addSubscriptionDetails(doc, successData, 420);

        // Features section
        this.addFeaturesSection(doc, successData, 520);

        // Footer
        this.addFooter(doc);

        doc.end();

      } catch (error) {
        console.error('PDF generation error:', error);
        reject(error);
      }
    });
  }

  // Add header to PDF
  addHeader(doc) {
    // Company logo area (placeholder)
    doc.rect(50, 50, 60, 60)
       .fillAndStroke('#6C63FF', '#6C63FF');
    
    doc.fontSize(12)
       .fillColor('white')
       .text('FIT', 65, 70)
       .text('WITH', 60, 85)
       .text('AI', 70, 100);

    // Company details
    doc.fontSize(20)
       .fillColor('#1f2937')
       .text('Fit-With-AI', 130, 60);

    doc.fontSize(10)
       .fillColor('#6b7280')
       .text('Your AI-Powered Fitness Companion', 130, 85)
       .text('Email: support@fitwith.ai', 130, 100)
       .text('Phone: +91-8885800887', 130, 115);

    // Invoice number and date
    doc.fontSize(10)
       .fillColor('#374151')
       .text(`Receipt Date: ${new Date().toLocaleDateString('en-IN')}`, 400, 70, { align: 'right' })
       .text(`Receipt #: ${this.generateReceiptNumber()}`, 400, 85, { align: 'right' });
  }

  // Add confirmation box
  addConfirmationBox(doc, successData, y) {
    // Success icon and message
    doc.rect(50, y, 495, 80)
       .fillAndStroke('#f0f9ff', '#3b82f6');

    doc.fontSize(16)
       .fillColor('#059669')
       .text('✓ Payment Successful!', 70, y + 20);

    doc.fontSize(12)
       .fillColor('#374151')
       .text(`Confirmation Number: ${successData.confirmation.confirmationNumber}`, 70, y + 45)
       .text(`Transaction ID: ${successData.payment.transactionId}`, 300, y + 45);
  }

  // Add payment details section
  addPaymentDetails(doc, successData, y) {
    doc.fontSize(14)
       .fillColor('#1f2937')
       .text('Payment Details', 50, y);

    // Payment details table
    const details = [
      ['Amount Paid:', `₹${successData.payment.amount}`],
      ['Payment Method:', successData.payment.paymentMethod],
      ['Gateway:', successData.payment.gateway],
      ['Status:', successData.payment.status],
      ['Date & Time:', successData.payment.formattedDate]
    ];

    let currentY = y + 25;
    details.forEach(([label, value]) => {
      doc.fontSize(10)
         .fillColor('#6b7280')
         .text(label, 70, currentY)
         .fillColor('#374151')
         .text(value, 200, currentY);
      currentY += 15;
    });
  }

  // Add subscription details section
  addSubscriptionDetails(doc, successData, y) {
    doc.fontSize(14)
       .fillColor('#1f2937')
       .text('Subscription Details', 50, y);

    const details = [
      ['Plan:', successData.subscription.planName],
      ['Duration:', successData.subscription.duration],
      ['Start Date:', new Date(successData.subscription.startDate).toLocaleDateString('en-IN')],
      ['Valid Until:', successData.subscription.endDate ? 
        new Date(successData.subscription.endDate).toLocaleDateString('en-IN') : 'Lifetime'],
      ['Status:', successData.subscription.status]
    ];

    let currentY = y + 25;
    details.forEach(([label, value]) => {
      doc.fontSize(10)
         .fillColor('#6b7280')
         .text(label, 70, currentY)
         .fillColor('#374151')
         .text(value, 200, currentY);
      currentY += 15;
    });
  }

  // Add features section
  addFeaturesSection(doc, successData, y) {
    doc.fontSize(14)
       .fillColor('#1f2937')
       .text('Your Premium Features', 50, y);

    doc.fontSize(10)
       .fillColor('#6b7280')
       .text('You now have access to the following features:', 70, y + 20);

    let currentY = y + 40;
    successData.subscription.features.forEach(feature => {
      doc.fontSize(9)
         .fillColor('#059669')
         .text('✓', 70, currentY)
         .fillColor('#374151')
         .text(feature, 85, currentY);
      currentY += 12;
    });
  }

  // Add footer
  addFooter(doc) {
    const footerY = 700;
    
    doc.rect(50, footerY, 495, 1)
       .fill('#e5e7eb');

    doc.fontSize(8)
       .fillColor('#6b7280')
       .text('This is a computer-generated receipt. No signature required.', 50, footerY + 15)
       .text('For support, contact us at support@fitwith.ai or +91-8885800887', 50, footerY + 30)
       .text('Thank you for choosing Fit-With-AI!', 50, footerY + 45, { align: 'center' });
  }

  // Generate receipt number
  generateReceiptNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `FWA${year}${month}${day}${random}`;
  }

  // Send confirmation email with PDF
  async sendConfirmationEmail(userEmail, userName, successData) {
    try {
      console.log(`📧 Sending payment confirmation email to: ${userEmail}`);

      // Generate PDF receipt
      const pdfBuffer = await this.generatePDFReceipt(successData);

      // Email content
      const emailSubject = `Payment Confirmation - ${successData.subscription.planName} Subscription`;
      
      const emailHTML = this.generateEmailHTML(successData);

      // Send email with PDF attachment
      const emailResult = await this.emailService.sendEmailWithAttachment(
        userEmail,
        userName,
        emailSubject,
        emailHTML,
        [{
          filename: `FitWithAI_Receipt_${successData.confirmation.confirmationNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      );

      console.log('✅ Payment confirmation email sent successfully');
      return {
        success: true,
        emailSent: true,
        pdfGenerated: true,
        confirmationNumber: successData.confirmation.confirmationNumber
      };

    } catch (error) {
      console.error('❌ Error sending confirmation email:', error);
      return {
        success: false,
        error: error.message,
        emailSent: false,
        pdfGenerated: false
      };
    }
  }

  // Generate email HTML content
  generateEmailHTML(successData) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #6C63FF, #4F46E5); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; }
            .success-badge { background: #10b981; color: white; padding: 20px; text-align: center; font-size: 18px; font-weight: 600; }
            .content { padding: 30px; }
            .confirmation-box { background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .details-section { margin: 25px 0; }
            .details-section h3 { color: #1f2937; margin-bottom: 15px; font-size: 18px; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { color: #6b7280; font-weight: 500; }
            .detail-value { color: #1f2937; font-weight: 600; }
            .features-list { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .feature-item { padding: 5px 0; color: #374151; }
            .feature-item::before { content: "✓"; color: #10b981; font-weight: bold; margin-right: 8px; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: #6C63FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 15px 0; }
            @media (max-width: 600px) {
                .container { margin: 0; }
                .content { padding: 20px; }
                .detail-row { flex-direction: column; }
                .detail-value { margin-top: 5px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Payment Successful!</h1>
                <p>Welcome to ${successData.subscription.planName}</p>
            </div>
            
            <div class="success-badge">
                ✓ Your subscription has been activated successfully
            </div>
            
            <div class="content">
                <div class="confirmation-box">
                    <h3 style="margin-top: 0; color: #1f2937;">Confirmation Details</h3>
                    <p><strong>Confirmation Number:</strong> ${successData.confirmation.confirmationNumber}</p>
                    <p><strong>Transaction ID:</strong> ${successData.payment.transactionId}</p>
                    <p><strong>Date:</strong> ${successData.payment.formattedDate}</p>
                </div>
                
                <div class="details-section">
                    <h3>Payment Summary</h3>
                    <div class="detail-row">
                        <span class="detail-label">Amount Paid</span>
                        <span class="detail-value">₹${successData.payment.amount}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment Method</span>
                        <span class="detail-value">${successData.payment.paymentMethod}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status</span>
                        <span class="detail-value" style="color: #10b981;">${successData.payment.status}</span>
                    </div>
                </div>
                
                <div class="details-section">
                    <h3>Subscription Details</h3>
                    <div class="detail-row">
                        <span class="detail-label">Plan</span>
                        <span class="detail-value">${successData.subscription.planName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Duration</span>
                        <span class="detail-value">${successData.subscription.duration}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Valid Until</span>
                        <span class="detail-value">${successData.subscription.endDate ? 
                          new Date(successData.subscription.endDate).toLocaleDateString('en-IN') : 'Lifetime'}</span>
                    </div>
                </div>
                
                <div class="features-list">
                    <h3 style="margin-top: 0;">Your Premium Features</h3>
                    <p style="color: #6b7280; margin-bottom: 15px;">You now have access to:</p>
                    ${successData.subscription.features.map(feature => 
                      `<div class="feature-item">${feature}</div>`
                    ).join('')}
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://fitwith.ai/dashboard" class="button">Start Using Premium Features</a>
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e;"><strong>📎 Receipt Attached:</strong> Your detailed payment receipt is attached as a PDF for your records.</p>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>Need Help?</strong></p>
                <p>Email: ${successData.confirmation.supportEmail} | Phone: ${successData.confirmation.supportPhone}</p>
                <p style="margin-top: 15px;">Thank you for choosing Fit-With-AI! 💪</p>
            </div>
        </div>
    </body>
    </html>`;
  }

  // Create payment success page
  async createSuccessPage(paymentDetails, subscriptionDetails, userDetails) {
    try {
      console.log('🎉 Creating payment success page');

      // Generate success data
      const successData = this.generateSuccessPageData(paymentDetails, subscriptionDetails, userDetails);

      // Send confirmation email with PDF
      const emailResult = await this.sendConfirmationEmail(
        userDetails.email,
        userDetails.fullName,
        successData
      );

      return {
        success: true,
        successData: successData,
        emailResult: emailResult,
        redirectUrl: `/payment/success?confirmation=${successData.confirmation.confirmationNumber}`
      };

    } catch (error) {
      console.error('❌ Error creating success page:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test payment simulation
  async testPaymentSimulation() {
    try {
      console.log('🧪 Testing payment simulation...');

      // Mock payment details
      const mockPaymentDetails = {
        transactionId: 'TXN_' + Date.now(),
        paymentId: 'PAY_' + Date.now(),
        amount: 10,
        paymentMethod: 'UPI',
        gateway: 'RAZORPAY'
      };

      // Mock subscription details
      const mockSubscriptionDetails = {
        plan: 'monthly',
        planName: 'Premium Monthly',
        duration: 'monthly',
        features: [
          'Unlimited AI coach',
          'Advanced nutrition tracking',
          'Custom meal plans',
          'Progress analytics',
          'Health rewards',
          'Priority support'
        ],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

      // Mock user details
      const mockUserDetails = {
        _id: 'user_' + Date.now(),
        fullName: 'Test User',
        email: 'test@example.com'
      };

      // Create success page
      const result = await this.createSuccessPage(
        mockPaymentDetails,
        mockSubscriptionDetails,
        mockUserDetails
      );

      console.log('✅ Payment simulation test completed:', result.success);
      return result;

    } catch (error) {
      console.error('❌ Payment simulation test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PaymentConfirmationService();