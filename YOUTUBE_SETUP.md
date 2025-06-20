# YouTube API Setup Guide

To enable real YouTube video search in your workout app, follow these steps:

## 1. Get YouTube Data API Key

### Step 1: Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Sign in with your Google account

### Step 2: Create or Select Project
- Click "Select a project" at the top
- Either create a new project or select an existing one

### Step 3: Enable YouTube Data API v3
- Go to "APIs & Services" > "Library"
- Search for "YouTube Data API v3"
- Click on it and press "Enable"

### Step 4: Create API Key
- Go to "APIs & Services" > "Credentials"
- Click "Create Credentials" > "API Key"
- Copy the generated API key

### Step 5: Add to Environment
- Open your `.env` file in the project root
- Add this line: `YOUTUBE_API_KEY=your_api_key_here`
- Replace `your_api_key_here` with your actual API key

## 2. Example .env file
```
YOUTUBE_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MONGODB_URI=mongodb+srv://...
SESSION_SECRET=your-secret-key
```

## 3. Restart Your App
After adding the API key, restart your application:
```bash
npm start
```

## 4. Test the Integration
- Go to the Workouts page
- Search for "cardio", "yoga", "HIIT", etc.
- You should now see real YouTube workout videos!

## Features with YouTube API:
- ✅ Real workout videos from YouTube
- ✅ Actual video thumbnails
- ✅ Real view counts and durations
- ✅ Channel information
- ✅ Fresh content updated from YouTube
- ✅ Videos that actually play

## Without YouTube API:
- ⚠️ Limited to 6 fallback videos
- ⚠️ Same videos for all searches
- ⚠️ Generic thumbnails

## API Limits:
- Free tier: 10,000 requests per day
- Each search uses 2 requests (search + details)
- Approximately 5,000 searches per day on free tier

## Security Note:
- Keep your API key secure
- Don't commit it to public repositories
- Consider restricting the API key to specific domains in production