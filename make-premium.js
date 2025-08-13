// Quick script to make you a premium user
// Run this in your browser console on the subscription page

console.log('🎯 Making you a premium user...');

// Set premium status in localStorage
const premiumData = {
    plan: 'Premium Pro',
    amount: 5,
    confirmation: 'FWA-PREMIUM-' + Date.now().toString().slice(-6),
    timestamp: new Date().toISOString()
};

localStorage.setItem('paymentSuccess', JSON.stringify(premiumData));

console.log('✅ Premium status set!');
console.log('📋 Premium data:', premiumData);

// Reload the page to see premium status
setTimeout(() => {
    console.log('🔄 Reloading page to show premium status...');
    location.reload();
}, 1000);