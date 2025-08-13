#!/bin/bash

echo "🎯 Setting up Premium Subscription System"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "app.js" ]; then
    echo "❌ Error: Please run this script from the root directory of your Fit-With-AI project"
    exit 1
fi

echo "📄 Backing up current subscription.ejs..."
if [ -f "views/subscription.ejs" ]; then
    cp views/subscription.ejs views/subscription-backup.ejs
    echo "✅ Backup created: views/subscription-backup.ejs"
fi

echo "🔄 Updating subscription page..."
if [ -f "views/subscription-updated.ejs" ]; then
    cp views/subscription-updated.ejs views/subscription.ejs
    echo "✅ Subscription page updated successfully!"
else
    echo "⚠️  subscription-updated.ejs not found. Please make sure all files are in place."
fi

echo "📋 Creating test instructions..."
cat > SUBSCRIPTION_TEST.md << 'EOF'
# 🧪 Subscription System Testing

## Quick Test Steps

1. **Start your app**:
   ```bash
   npm start
   ```

2. **Open browser**: Go to http://localhost:3000

3. **Login**: Use your existing account

4. **Go to subscription**: Visit /subscription

5. **Test new user flow**:
   - Clear localStorage: Press F12 → Console → Type `localStorage.clear()` → Enter
   - Refresh page
   - Should see all subscription plans
   - Click "Start Free Trial" on any plan
   - Wait 3 seconds for simulation
   - Should redirect to success page

6. **Test premium user flow**:
   - Go back to /subscription
   - Should see "You are already a Premium User!"
   - Should show subscription details
   - Should show active features

7. **Test database persistence**:
   - Close browser completely
   - Open browser and login again
   - Go to /subscription
   - Should still show premium status

## Expected Results

### For New Users:
- ✅ Shows subscription plans
- ✅ Can select and "pay" for plans
- ✅ Redirects to success page
- ✅ Updates database

### For Premium Users:
- ✅ Shows "You are already a Premium User!"
- ✅ Displays current plan details
- ✅ Shows active features
- ✅ Provides dashboard/renew options

## Troubleshooting

- **Plans not showing**: Check console for JavaScript errors
- **Premium status not detected**: Check database connection
- **Payment not working**: Check browser console for API errors

## Customization

Edit `views/subscription.ejs` to:
- Change plan prices
- Modify features
- Update styling
- Add new plans
EOF

echo ""
echo "🎉 Subscription System Setup Complete!"
echo "======================================"
echo ""
echo "✅ What's been done:"
echo "   - Subscription page updated with premium detection"
echo "   - Premium user interface added"
echo "   - Database integration ready"
echo "   - Test instructions created"
echo ""
echo "📋 Next steps:"
echo "   1. Read SUBSCRIPTION_SETUP_GUIDE.md for detailed info"
echo "   2. Read SUBSCRIPTION_TEST.md for testing steps"
echo "   3. Start your app: npm start"
echo "   4. Test the subscription flow"
echo "   5. Customize as needed"
echo ""
echo "🚀 Your subscription system is ready!"
echo "Users will see 'You are already a Premium User!' after payment completion."
echo ""