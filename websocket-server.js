const WebSocket = require('ws');
const http = require('http');

// Create HTTP server
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Store connected users
const connectedUsers = new Map();

wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (error) {
            console.error('Invalid message:', error);
        }
    });
    
    ws.on('close', () => {
        // Remove user from connected users
        for (const [userId, userWs] of connectedUsers.entries()) {
            if (userWs === ws) {
                connectedUsers.delete(userId);
                console.log(`User ${userId} disconnected`);
                break;
            }
        }
    });
});

function handleMessage(ws, data) {
    switch (data.type) {
        case 'register':
            // Register user with their WebSocket connection
            connectedUsers.set(data.userId, ws);
            console.log(`User ${data.userId} registered`);
            break;
            
        case 'call-request':
            // Forward call request to target user
            const targetUser = connectedUsers.get(data.to);
            if (targetUser && targetUser.readyState === WebSocket.OPEN) {
                targetUser.send(JSON.stringify({
                    type: 'incoming-call',
                    from: data.from,
                    callId: data.callId,
                    isVideo: data.isVideo
                }));
            }
            break;
            
        case 'call-accept':
            // Forward call acceptance
            forwardToUser(data.to, {
                type: 'call-accepted',
                callId: data.callId,
                from: data.from
            });
            break;
            
        case 'call-reject':
            // Forward call rejection
            forwardToUser(data.to, {
                type: 'call-rejected',
                callId: data.callId
            });
            break;
            
        case 'call-offer':
            // Forward WebRTC offer
            forwardToUser(data.to, {
                type: 'call-offer',
                callId: data.callId,
                offer: data.offer,
                from: data.from
            });
            break;
            
        case 'call-answer':
            // Forward WebRTC answer
            forwardToUser(data.to, {
                type: 'call-answer',
                callId: data.callId,
                answer: data.answer
            });
            break;
            
        case 'ice-candidate':
            // Forward ICE candidate
            forwardToUser(data.to, {
                type: 'ice-candidate',
                callId: data.callId,
                candidate: data.candidate
            });
            break;
            
        case 'call-end':
            // Forward call end
            forwardToUser(data.to, {
                type: 'call-ended',
                callId: data.callId
            });
            break;
    }
}

function forwardToUser(userId, message) {
    const userWs = connectedUsers.get(userId);
    if (userWs && userWs.readyState === WebSocket.OPEN) {
        userWs.send(JSON.stringify(message));
    }
}

const PORT = 3010;
server.listen(PORT, () => {
    console.log(`WebSocket server running on port ${PORT}`);
});