#!/bin/bash

# Option 1: Deploy as separate project
echo "Creating admin deployment folder..."
mkdir -p ../fitwith-admin
cp admin-ultimate.js ../fitwith-admin/
cp -r api ../fitwith-admin/
cp admin-vercel.json ../fitwith-admin/vercel.json
cp admin-package.json ../fitwith-admin/package.json
cp .env ../fitwith-admin/

cd ../fitwith-admin
echo "Deploying admin panel..."
vercel --prod

echo "Admin panel deployed! Check your Vercel dashboard for the URL."