# Environment Configuration Guide

This document outlines the required environment variables for the Fit-With-AI application.

## Required Environment Variables

### Server Configuration
- `NODE_ENV`: Set to `development` or `production`
- `PORT`: The port number the server will run on (default: 3000)

### Session Configuration
- `SESSION_SECRET`: A secure random string used to sign the session ID cookie
  - Generate a secure secret using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Email Configuration
- `EMAIL_USER`: Gmail address for sending emails
- `EMAIL_PASS`: App-specific password for Gmail
  - Generate an app password in your Google Account settings
  - Do not use your regular Gmail password

### Redis Configuration (Optional)
- `REDIS_URL`: URL for Redis connection (required for production)

### Security Settings
- `COOKIE_SECURE`: Set to `true` in production
- `COOKIE_SAME_SITE`: Set to `none` in production

## Setting Up Environment Variables

1. Create a `.env` file in the root directory
2. Copy the variables above and set their values
3. Never commit the `.env` file to version control
4. For production, set these variables in your hosting platform (e.g., Vercel)

## Security Notes

- Never commit sensitive credentials to version control
- Use strong, unique values for secrets
- Rotate credentials periodically
- Use environment-specific values for development and production 