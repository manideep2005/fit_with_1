/**
 * Payment Success Redirect Handler
 * Handles redirection to success page after payment completion
 */

// Override the verifyPayment function to redirect to success page
function enhancePaymentFlow() {
    // Store original verifyPayment function
    const originalVerifyPayment = window.verifyPayment;
    
    if (typeof originalVerifyPayment === 'function') {
        window.verifyPayment = async function() {
            try {
                console.log('🔍 Enhanced payment verification starting...');
                
                const response = await fetch('/api/payment/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        paymentId: currentPaymentId,
                        verificationCode: '123456' // Demo code
                    })
                });

                const data = await response.json();

                if (data.success) {
                    console.log('✅ Payment verified successfully!');
                    
                    // Hide payment modal
                    const paymentModal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
                    if (paymentModal) {
                        paymentModal.hide();
                    }
                    
                    // Clear payment data
                    const paymentIdForRedirect = currentPaymentId;
                    currentPaymentId = null;
                    if (window.paymentTimer) {
                        clearInterval(window.paymentTimer);
                    }
                    
                    // Show loading overlay
                    showLoadingOverlay();
                    
                    // Generate confirmation number
                    const confirmationNumber = 'FWA-' + Date.now().toString().slice(-6) + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                    
                    // Show success toast
                    showSuccessToast('Payment successful! Redirecting to confirmation page...');
                    
                    // Redirect to success page after 2 seconds
                    setTimeout(() => {
                        const successUrl = `/api/payment/success?confirmation=${confirmationNumber}&paymentId=${paymentIdForRedirect}&plan=${selectedPlan || 'premium'}&amount=${data.amount || 10}`;
                        console.log('🚀 Redirecting to:', successUrl);
                        window.location.href = successUrl;
                    }, 2000);
                    
                } else {
                    console.error('❌ Payment verification failed:', data.error);
                    showErrorToast(data.error || 'Payment verification failed');
                }

            } catch (error) {
                console.error('❌ Error verifying payment:', error);
                showErrorToast('Payment verification failed');
            }
        };
        
        console.log('✅ Payment flow enhanced with success page redirect');
    }
}

// Show loading overlay
function showLoadingOverlay() {
    // Remove existing overlay
    const existingOverlay = document.getElementById('paymentLoadingOverlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'paymentLoadingOverlay';
    overlay.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        ">
            <div class="text-center">
                <div style="
                    width: 60px;
                    height: 60px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #6366f1;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <h4 style="color: #6366f1; margin-bottom: 10px;">Payment Successful!</h4>
                <p style="color: #6b7280;">Preparing your confirmation page...</p>
                <div style="
                    background: #f0f9ff;
                    border: 1px solid #3b82f6;
                    border-radius: 8px;
                    padding: 15px;
                    margin-top: 20px;
                    max-width: 300px;
                ">
                    <i class="fas fa-check-circle" style="color: #10b981; margin-right: 8px;"></i>
                    <span style="color: #374151;">Subscription activated successfully</span>
                </div>
            </div>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.appendChild(overlay);
}

// Show success toast
function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-weight: 500;
        max-width: 350px;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Show error toast
function showErrorToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-weight: 500;
        max-width: 350px;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for other scripts to load
    setTimeout(() => {
        enhancePaymentFlow();
    }, 1000);
});

// Also enhance if called directly
if (typeof window !== 'undefined') {
    window.enhancePaymentFlow = enhancePaymentFlow;
    window.showLoadingOverlay = showLoadingOverlay;
    window.showSuccessToast = showSuccessToast;
    window.showErrorToast = showErrorToast;
}