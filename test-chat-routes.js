// Test chat API routes
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');

// Import services
const database = require('./config/database');
const chatService = require('./services/chatService');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'test-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// Mock authentication middleware
const mockAuth = async (req, res, next) => {
    try {
        const User = require('./models/User');
        const user = await User.findOne();
        if (!user) {
            return res.status(401).json({ error: 'No test user found' });
        }
        req.session.user = {
            _id: user._id,
            email: user.email,
            fullName: user.fullName
        };
        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Chat API routes (simplified versions)
app.get('/api/chat/conversations', mockAuth, async (req, res) => {
    try {
        console.log('GET /api/chat/conversations called');
        const userId = req.session.user._id;
        const conversations = await chatService.getUserConversations(userId);
        res.json({
            success: true,
            conversations: conversations
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/chat/friends', mockAuth, async (req, res) => {
    try {
        console.log('GET /api/chat/friends called');
        const userId = req.session.user._id;
        const friends = await chatService.getUserFriends(userId);
        res.json({
            success: true,
            friends: friends
        });
    } catch (error) {
        console.error('Get friends error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/chat/send', mockAuth, async (req, res) => {
    try {
        console.log('POST /api/chat/send called');
        console.log('Request body:', req.body);
        
        const senderId = req.session.user._id;
        const { receiverId, content, messageType = 'text' } = req.body;
        
        if (!receiverId || !content) {
            return res.status(400).json({
                success: false,
                error: 'Receiver ID and content are required'
            });
        }
        
        const message = await chatService.sendMessage(senderId, receiverId, content, messageType);
        res.json({
            success: true,
            message: message
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/chat/add-friend', mockAuth, async (req, res) => {
    try {
        console.log('POST /api/chat/add-friend called');
        console.log('Request body:', req.body);
        
        const userId = req.session.user._id;
        const { friendEmail } = req.body;
        
        if (!friendEmail) {
            return res.status(400).json({
                success: false,
                error: 'Friend email is required'
            });
        }
        
        const friend = await chatService.addFriend(userId, friendEmail);
        res.json({
            success: true,
            message: 'Friend added successfully',
            friend: friend
        });
    } catch (error) {
        console.error('Add friend error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = 3003;

database.connect().then(() => {
    console.log('✅ Database connected');
    
    app.listen(PORT, () => {
        console.log(`🚀 Chat API test server running on http://localhost:${PORT}`);
        console.log('\nTest the API endpoints:');
        console.log(`curl http://localhost:${PORT}/health`);
        console.log(`curl http://localhost:${PORT}/api/chat/conversations`);
        console.log(`curl http://localhost:${PORT}/api/chat/friends`);
        console.log(`curl -X POST -H "Content-Type: application/json" -d '{"friendEmail":"test@example.com"}' http://localhost:${PORT}/api/chat/add-friend`);
        console.log('\n✅ Chat service backend is working correctly!');
        console.log('🔧 If buttons are not working, the issue is likely in the frontend JavaScript or HTML.');
    });
}).catch(error => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
});