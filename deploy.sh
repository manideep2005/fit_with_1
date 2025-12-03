#!/bin/bash
echo "🚀 Deploying Fit-With-AI..."

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "📦 Starting deployment..."
vercel --prod

echo "✅ Deployment complete!"
echo "🌐 Your app should be live at your Vercel URL"