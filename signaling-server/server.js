const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Enable CORS for all origins (configure for production)
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        connectedClients: wss.clients.size,
        uptime: process.uptime()
    });
});

// WebSocket server
const wss = new WebSocket.Server({ 
    server,
    path: '/signaling'
});

// Store connected clients
const clients = new Map();
const activeRooms = new Map();

console.log('🚀 Starting WebRTC Signaling Server...');

wss.on('connection', (ws, req) => {
    console.log('📱 New WebSocket connection from:', req.socket.remoteAddress);
    
    let clientId = null;
    let currentRoom = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());
            console.log('📨 Received message:', data.type, 'from:', clientId);

            switch (data.type) {
                case 'register':
                    await handleRegister(ws, data);
                    break;
                case 'call-request':
                    await handleCallRequest(ws, data);
                    break;
                case 'call-accept':
                    await handleCallAccept(ws, data);
                    break;
                case 'call-reject':
                    await handleCallReject(ws, data);
                    break;
                case 'call-offer':
                    await handleCallOffer(ws, data);
                    break;
                case 'call-answer':
                    await handleCallAnswer(ws, data);
                    break;
                case 'ice-candidate':
                    await handleIceCandidate(ws, data);
                    break;
                case 'call-end':
                    await handleCallEnd(ws, data);
                    break;
                case 'heartbeat':
                    handleHeartbeat(ws);
                    break;
                default:
                    console.log('❓ Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('❌ Error processing message:', error);
            sendError(ws, 'Invalid message format');
        }
    });

    ws.on('close', () => {
        console.log('📱 Client disconnected:', clientId);
        if (clientId) {
            clients.delete(clientId);
            
            // Clean up any active rooms
            if (currentRoom) {
                cleanupRoom(currentRoom);
            }
        }
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });

    // Register client
    async function handleRegister(ws, data) {
        clientId = data.userId;
        clients.set(clientId, {
            ws: ws,
            userId: clientId,
            userInfo: data.userInfo || {},
            lastSeen: Date.now()
        });
        
        console.log('✅ Client registered:', clientId);
        
        // Send registration confirmation
        send(ws, {
            type: 'registered',
            clientId: clientId,
            timestamp: Date.now()
        });
    }

    // Handle call request
    async function handleCallRequest(ws, data) {
        const { to, from, callId, isVideo } = data;
        
        console.log(`📞 Call request: ${from.id} -> ${to} (${isVideo ? 'video' : 'audio'})`);
        
        const targetClient = clients.get(to);
        if (!targetClient) {
            console.log('❌ Target client not found:', to);
            send(ws, {
                type: 'call-failed',
                reason: 'User not available',
                callId: callId
            });
            return;
        }

        // Create room for the call
        const roomId = `call_${callId}`;
        activeRooms.set(roomId, {
            callId: callId,
            caller: from.id,
            callee: to,
            isVideo: isVideo,
            status: 'ringing',
            createdAt: Date.now()
        });

        // Send incoming call notification to target
        send(targetClient.ws, {
            type: 'incoming-call',
            from: from,
            callId: callId,
            isVideo: isVideo,
            roomId: roomId
        });

        console.log('✅ Call request sent to:', to);
    }

    // Handle call accept
    async function handleCallAccept(ws, data) {
        const { callId, to, from } = data;
        
        console.log(`✅ Call accepted: ${callId}`);
        
        const roomId = `call_${callId}`;
        const room = activeRooms.get(roomId);
        
        if (!room) {
            console.log('❌ Room not found for call:', callId);
            return;
        }

        room.status = 'connecting';
        
        const callerClient = clients.get(to);
        if (callerClient) {
            send(callerClient.ws, {
                type: 'call-accepted',
                callId: callId,
                from: from
            });
        }
    }

    // Handle call reject
    async function handleCallReject(ws, data) {
        const { callId, to } = data;
        
        console.log(`❌ Call rejected: ${callId}`);
        
        const callerClient = clients.get(to);
        if (callerClient) {
            send(callerClient.ws, {
                type: 'call-rejected',
                callId: callId
            });
        }

        // Clean up room
        const roomId = `call_${callId}`;
        activeRooms.delete(roomId);
    }

    // Handle WebRTC offer
    async function handleCallOffer(ws, data) {
        const { callId, to, offer, from } = data;
        
        console.log(`📤 Forwarding offer for call: ${callId}`);
        
        const targetClient = clients.get(to);
        if (targetClient) {
            send(targetClient.ws, {
                type: 'call-offer',
                callId: callId,
                offer: offer,
                from: from
            });
        }
    }

    // Handle WebRTC answer
    async function handleCallAnswer(ws, data) {
        const { callId, to, answer } = data;
        
        console.log(`📤 Forwarding answer for call: ${callId}`);
        
        const targetClient = clients.get(to);
        if (targetClient) {
            send(targetClient.ws, {
                type: 'call-answer',
                callId: callId,
                answer: answer
            });
        }

        // Update room status
        const roomId = `call_${callId}`;
        const room = activeRooms.get(roomId);
        if (room) {
            room.status = 'connected';
        }
    }

    // Handle ICE candidate
    async function handleIceCandidate(ws, data) {
        const { callId, to, candidate } = data;
        
        const targetClient = clients.get(to);
        if (targetClient) {
            send(targetClient.ws, {
                type: 'ice-candidate',
                callId: callId,
                candidate: candidate
            });
        }
    }

    // Handle call end
    async function handleCallEnd(ws, data) {
        const { callId, to } = data;
        
        console.log(`📞 Call ended: ${callId}`);
        
        if (to) {
            const targetClient = clients.get(to);
            if (targetClient) {
                send(targetClient.ws, {
                    type: 'call-ended',
                    callId: callId
                });
            }
        }

        // Clean up room
        const roomId = `call_${callId}`;
        cleanupRoom(roomId);
    }

    // Handle heartbeat
    function handleHeartbeat(ws) {
        if (clientId) {
            const client = clients.get(clientId);
            if (client) {
                client.lastSeen = Date.now();
            }
        }
        
        send(ws, {
            type: 'heartbeat-ack',
            timestamp: Date.now()
        });
    }
});

// Helper functions
function send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

function sendError(ws, message) {
    send(ws, {
        type: 'error',
        message: message,
        timestamp: Date.now()
    });
}

function cleanupRoom(roomId) {
    activeRooms.delete(roomId);
    console.log('🧹 Cleaned up room:', roomId);
}

// Cleanup inactive clients every 30 seconds
setInterval(() => {
    const now = Date.now();
    const timeout = 60000; // 1 minute timeout
    
    for (const [clientId, client] of clients.entries()) {
        if (now - client.lastSeen > timeout) {
            console.log('🧹 Removing inactive client:', clientId);
            clients.delete(clientId);
            
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.close();
            }
        }
    }
    
    // Cleanup old rooms
    for (const [roomId, room] of activeRooms.entries()) {
        if (now - room.createdAt > 300000) { // 5 minutes
            console.log('🧹 Removing old room:', roomId);
            activeRooms.delete(roomId);
        }
    }
}, 30000);

// Start server
const PORT = process.env.PORT || 3010;
server.listen(PORT, () => {
    console.log(`🚀 WebRTC Signaling Server running on port ${PORT}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/signaling`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 Shutting down signaling server...');
    
    // Close all WebSocket connections
    wss.clients.forEach((ws) => {
        ws.close();
    });
    
    server.close(() => {
        console.log('✅ Server shut down gracefully');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 Received SIGINT, shutting down...');
    process.emit('SIGTERM');
});