# Deploy to Vercel with Socket.IO

## Steps to Deploy:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables** in Vercel Dashboard:
   - Go to your project settings in Vercel
   - Add these environment variables:
     - `MONGODB_URI`: Your MongoDB connection string
     - `SESSION_SECRET`: Your session secret
     - `EMAIL_USER`: Your email for notifications
     - `EMAIL_PASS`: Your email password
     - `YOUTUBE_API_KEY`: Your YouTube API key
     - `NODE_ENV`: production

5. **Update ALLOWED_ORIGINS** in your Vercel environment:
   - Set `ALLOWED_ORIGINS` to your Vercel domain: `https://your-app.vercel.app`

## Important Notes:

- Socket.IO will work on Vercel with serverless functions
- The WebRTC signaling will use `/api/socket` endpoint
- Make sure your client connects to the correct Socket.IO path
- Test the calling functionality after deployment

## Testing:

1. Open your deployed app
2. Login with two different accounts (use different browsers/incognito)
3. Add each other as friends
4. Try making audio/video calls

## Troubleshooting:

If calls don't work:
1. Check browser console for errors
2. Ensure microphone/camera permissions are granted
3. Check if Socket.IO connection is established
4. Verify STUN servers are accessible