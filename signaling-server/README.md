# WebRTC Signaling Server

This is a standalone WebRTC signaling server for handling audio/video calls in the Fit-With-AI application.

## Why a Separate Server?

Vercel is a serverless platform that doesn't support persistent WebSocket connections. For real-time audio/video calling, we need:
- Persistent WebSocket connections for signaling
- Real-time message relay between clients
- Connection state management

This server can be deployed on platforms that support WebSockets like:
- Railway
- Render
- Heroku
- DigitalOcean App Platform
- AWS EC2
- Google Cloud Run

## Features

- WebRTC signaling for audio/video calls
- Real-time message relay
- Connection management
- Automatic cleanup of inactive connections
- Health monitoring
- CORS support for cross-origin requests

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`

4. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## Deployment Options

### 1. Railway (Recommended)
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically

### 2. Render
1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy as a Web Service

### 3. Heroku
1. Create a new Heroku app
2. Set environment variables using Heroku CLI or dashboard
3. Deploy using Git

### 4. DigitalOcean App Platform
1. Create a new app from GitHub
2. Configure environment variables
3. Deploy

## Environment Variables

- `PORT`: Server port (default: 3010)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS

## API Endpoints

- `GET /health`: Health check endpoint
- `WebSocket /signaling`: WebSocket endpoint for signaling

## WebSocket Messages

### Client to Server:
- `register`: Register client with user ID
- `call-request`: Initiate a call
- `call-accept`: Accept incoming call
- `call-reject`: Reject incoming call
- `call-offer`: WebRTC offer
- `call-answer`: WebRTC answer
- `ice-candidate`: ICE candidate
- `call-end`: End call
- `heartbeat`: Keep connection alive

### Server to Client:
- `registered`: Registration confirmation
- `incoming-call`: Incoming call notification
- `call-accepted`: Call was accepted
- `call-rejected`: Call was rejected
- `call-offer`: WebRTC offer relay
- `call-answer`: WebRTC answer relay
- `ice-candidate`: ICE candidate relay
- `call-ended`: Call ended by other party
- `heartbeat-ack`: Heartbeat acknowledgment

## Integration with Main App

Update your main application's WebSocket connection to point to this server:

```javascript
// In your chat.ejs or main app
const SIGNALING_SERVER = process.env.NODE_ENV === 'production' 
    ? 'wss://your-signaling-server.railway.app/signaling'
    : 'ws://localhost:3010/signaling';

socket = new WebSocket(SIGNALING_SERVER);
```

## Monitoring

The server provides:
- Connection count monitoring
- Automatic cleanup of inactive connections
- Health check endpoint for monitoring services
- Detailed logging for debugging

## Security Considerations

- Configure CORS properly for production
- Consider adding authentication if needed
- Use HTTPS/WSS in production
- Monitor connection limits
- Implement rate limiting if needed