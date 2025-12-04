#!/bin/bash

echo "🚀 Starting fresh Vercel deployment..."

# Clear local cache
echo "🧹 Clearing local cache..."
rm -rf .vercel
rm -rf node_modules/.cache

# Force fresh deployment
echo "📦 Deploying to Vercel..."
vercel --prod --force

echo "✅ Deployment complete!"
echo "🔄 If changes still don't appear, wait 2-3 minutes for global CDN propagation"