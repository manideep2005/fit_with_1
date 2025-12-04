// Advanced Socket.IO Service for WhatsApp-like Chat
class AdvancedSocketService {
    constructor() {
        this.connectedUsers = new Map(); // userId -> { socketId, userInfo, lastSeen, status }
        this.userSockets = new Map(); // socketId -> userId
        this.typingUsers = new Map(); // conversationId -> Set of userIds
        this.messageQueue = new Map(); // userId -> Array of messages
        this.heartbeatInterval = null;
        
        this.init();
    }

    init() {
        this.startHeartbeat();
        console.log('✅ Advanced Socket Service initialized');
    }

    setupSocketHandlers(io) {
        io.on('connection', (socket) => {
            console.log('🔌 New socket connection:', socket.id);

            // User registration
            socket.on('register', (data) => {
                this.handleUserRegistration(socket, data);
            });

            // Message handling
            socket.on('send message', (data) => {
                this.handleSendMessage(socket, data, io);
            });

            // Typing indicators
            socket.on('typing', (data) => {
                this.handleTyping(socket, data, io);
            });

            socket.on('stop typing', (data) => {
                this.handleStopTyping(socket, data, io);
            });

            // Message status updates
            socket.on('message delivered', (data) => {
                this.handleMessageDelivered(socket, data, io);
            });

            socket.on('message read', (data) => {
                this.handleMessageRead(socket, data, io);
            });

            // Presence updates
            socket.on('presence update', (data) => {
                this.handlePresenceUpdate(socket, data, io);
            });

            // Heartbeat
            socket.on('heartbeat', () => {
                this.handleHeartbeat(socket);
            });

            // Friend requests
            socket.on('friend request', (data) => {
                this.handleFriendRequest(socket, data, io);
            });

            // Disconnect handling
            socket.on('disconnect', () => {
                this.handleDisconnect(socket, io);
            });

            // Error handling
            socket.on('error', (error) => {
                console.error('Socket error:', error);
            });
        });

        console.log('✅ Socket handlers configured');
    }

    handleUserRegistration(socket, data) {
        try {
            const { userId, userInfo } = data;
            
            if (!userId) {
                socket.emit('error', { message: 'User ID is required' });
                return;
            }

            // Remove user from previous socket if exists
            const existingUser = this.connectedUsers.get(userId);
            if (existingUser && existingUser.socketId !== socket.id) {
                this.userSockets.delete(existingUser.socketId);
            }

            // Register user
            this.connectedUsers.set(userId, {
                socketId: socket.id,
                userInfo: userInfo || {},
                lastSeen: new Date(),
                status: 'online',
                joinedAt: new Date()
            });

            this.userSockets.set(socket.id, userId);

            // Join user to their personal room
            socket.join(userId);

            // Notify friends about online status
            this.broadcastPresenceUpdate(userId, 'online', socket.io);

            // Send queued messages
            this.deliverQueuedMessages(userId, socket);

            socket.emit('registered', {
                success: true,
                userId: userId,
                onlineUsers: this.getOnlineUsersList()
            });

            console.log(`✅ User registered: ${userId} (${socket.id})`);
        } catch (error) {
            console.error('Registration error:', error);
            socket.emit('error', { message: 'Registration failed' });
        }
    }

    async handleSendMessage(socket, data, io) {
        try {
            const senderId = this.userSockets.get(socket.id);
            if (!senderId) {
                socket.emit('error', { message: 'User not registered' });
                return;
            }

            const { receiverId, content, messageType = 'text', tempId } = data;

            if (!receiverId || !content) {
                socket.emit('error', { message: 'Receiver ID and content are required' });
                return;
            }

            // Save message to database
            const chatService = require('./chatService');
            const message = await chatService.sendMessage(senderId, receiverId, content, messageType);

            // Update message with real ID if tempId provided
            const messageData = {
                ...message.toObject(),
                tempId: tempId,
                sender: {
                    _id: senderId,
                    fullName: this.connectedUsers.get(senderId)?.userInfo?.name || 'User'
                },
                receiver: {
                    _id: receiverId
                },
                status: 'sent',
                timestamp: message.createdAt
            };

            // Send to receiver if online
            const receiverConnection = this.connectedUsers.get(receiverId);
            if (receiverConnection) {
                io.to(receiverId).emit('new message', {
                    ...messageData,
                    status: 'delivered'
                });

                // Update message status to delivered
                setTimeout(() => {
                    socket.emit('message delivered', {
                        messageId: message._id,
                        tempId: tempId
                    });
                }, 100);
            } else {
                // Queue message for offline user
                this.queueMessage(receiverId, messageData);
            }

            // Confirm to sender
            socket.emit('message sent', {
                ...messageData,
                status: receiverConnection ? 'delivered' : 'sent'
            });

            console.log(`📨 Message sent: ${senderId} -> ${receiverId}`);
        } catch (error) {
            console.error('Send message error:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    }

    handleTyping(socket, data, io) {
        try {
            const senderId = this.userSockets.get(socket.id);
            if (!senderId) return;

            const { to: receiverId } = data;
            if (!receiverId) return;

            // Notify receiver about typing
            io.to(receiverId).emit('typing', {
                from: senderId,
                senderName: this.connectedUsers.get(senderId)?.userInfo?.name || 'User'
            });

            console.log(`⌨️ Typing: ${senderId} -> ${receiverId}`);
        } catch (error) {
            console.error('Typing error:', error);
        }
    }

    handleStopTyping(socket, data, io) {
        try {
            const senderId = this.userSockets.get(socket.id);
            if (!senderId) return;

            const { to: receiverId } = data;
            if (!receiverId) return;

            // Notify receiver about stop typing
            io.to(receiverId).emit('stop typing', {
                from: senderId
            });

            console.log(`⌨️ Stop typing: ${senderId} -> ${receiverId}`);
        } catch (error) {
            console.error('Stop typing error:', error);
        }
    }

    handleMessageDelivered(socket, data, io) {
        try {
            const userId = this.userSockets.get(socket.id);
            if (!userId) return;

            const { messageId, senderId } = data;

            // Notify sender about delivery
            const senderConnection = this.connectedUsers.get(senderId);
            if (senderConnection) {
                io.to(senderId).emit('message delivered', {
                    messageId: messageId,
                    deliveredAt: new Date()
                });
            }

            console.log(`✅ Message delivered: ${messageId}`);
        } catch (error) {
            console.error('Message delivered error:', error);
        }
    }

    handleMessageRead(socket, data, io) {
        try {
            const userId = this.userSockets.get(socket.id);
            if (!userId) return;

            const { messageId, senderId } = data;

            // Update message status in database
            const Message = require('../models/Message');
            Message.updateOne(
                { _id: messageId },
                { status: 'read', readAt: new Date() }
            ).catch(console.error);

            // Notify sender about read receipt
            const senderConnection = this.connectedUsers.get(senderId);
            if (senderConnection) {
                io.to(senderId).emit('message read', {
                    messageId: messageId,
                    readAt: new Date(),
                    readBy: userId
                });
            }

            console.log(`👁️ Message read: ${messageId} by ${userId}`);
        } catch (error) {
            console.error('Message read error:', error);
        }
    }

    handlePresenceUpdate(socket, data, io) {
        try {
            const userId = this.userSockets.get(socket.id);
            if (!userId) return;

            const { status } = data;
            const validStatuses = ['online', 'away', 'busy', 'offline'];
            
            if (!validStatuses.includes(status)) return;

            // Update user status
            const userConnection = this.connectedUsers.get(userId);
            if (userConnection) {
                userConnection.status = status;
                userConnection.lastSeen = new Date();
            }

            // Broadcast presence update to friends
            this.broadcastPresenceUpdate(userId, status, io);

            console.log(`👤 Presence update: ${userId} -> ${status}`);
        } catch (error) {
            console.error('Presence update error:', error);
        }
    }

    handleHeartbeat(socket) {
        try {
            const userId = this.userSockets.get(socket.id);
            if (!userId) return;

            const userConnection = this.connectedUsers.get(userId);
            if (userConnection) {
                userConnection.lastSeen = new Date();
            }

            socket.emit('heartbeat_ack');
        } catch (error) {
            console.error('Heartbeat error:', error);
        }
    }

    handleFriendRequest(socket, data, io) {
        try {
            const senderId = this.userSockets.get(socket.id);
            if (!senderId) return;

            const { receiverId, senderName, senderAvatar } = data;

            // Notify receiver about friend request
            io.to(receiverId).emit('friend request', {
                senderId: senderId,
                senderName: senderName,
                senderAvatar: senderAvatar,
                timestamp: new Date()
            });

            console.log(`👥 Friend request: ${senderId} -> ${receiverId}`);
        } catch (error) {
            console.error('Friend request error:', error);
        }
    }

    handleDisconnect(socket, io) {
        try {
            const userId = this.userSockets.get(socket.id);
            if (!userId) return;

            // Update last seen
            const userConnection = this.connectedUsers.get(userId);
            if (userConnection) {
                userConnection.lastSeen = new Date();
                userConnection.status = 'offline';
            }

            // Remove from maps
            this.userSockets.delete(socket.id);
            this.connectedUsers.delete(userId);

            // Broadcast offline status to friends
            this.broadcastPresenceUpdate(userId, 'offline', io);

            console.log(`❌ User disconnected: ${userId} (${socket.id})`);
        } catch (error) {
            console.error('Disconnect error:', error);
        }
    }

    async broadcastPresenceUpdate(userId, status, io) {
        try {
            // Get user's friends
            const chatService = require('./chatService');
            const friends = await chatService.getUserFriends(userId).catch(() => []);

            const presenceData = {
                userId: userId,
                status: status,
                lastSeen: new Date(),
                online: status === 'online'
            };

            // Notify each friend
            friends.forEach(friend => {
                const friendConnection = this.connectedUsers.get(friend._id.toString());
                if (friendConnection) {
                    io.to(friend._id.toString()).emit('presence update', presenceData);
                }
            });
        } catch (error) {
            console.error('Broadcast presence error:', error);
        }
    }

    queueMessage(userId, message) {
        if (!this.messageQueue.has(userId)) {
            this.messageQueue.set(userId, []);
        }
        
        const queue = this.messageQueue.get(userId);
        queue.push(message);

        // Limit queue size
        if (queue.length > 100) {
            queue.shift();
        }
    }

    deliverQueuedMessages(userId, socket) {
        const queue = this.messageQueue.get(userId);
        if (!queue || queue.length === 0) return;

        // Send all queued messages
        queue.forEach(message => {
            socket.emit('new message', {
                ...message,
                status: 'delivered',
                queued: true
            });
        });

        // Clear queue
        this.messageQueue.delete(userId);

        console.log(`📬 Delivered ${queue.length} queued messages to ${userId}`);
    }

    getOnlineUsersList() {
        const onlineUsers = [];
        this.connectedUsers.forEach((connection, userId) => {
            if (connection.status === 'online') {
                onlineUsers.push({
                    userId: userId,
                    userInfo: connection.userInfo,
                    joinedAt: connection.joinedAt
                });
            }
        });
        return onlineUsers;
    }

    getUserPresence(userId) {
        const connection = this.connectedUsers.get(userId);
        if (!connection) {
            return { online: false, lastSeen: null, status: 'offline' };
        }

        return {
            online: connection.status === 'online',
            lastSeen: connection.lastSeen,
            status: connection.status
        };
    }

    isUserOnline(userId) {
        const connection = this.connectedUsers.get(userId);
        return connection && connection.status === 'online';
    }

    getOnlineUsersCount() {
        let count = 0;
        this.connectedUsers.forEach(connection => {
            if (connection.status === 'online') count++;
        });
        return count;
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            const now = new Date();
            const timeout = 60000; // 1 minute timeout

            // Check for inactive users
            this.connectedUsers.forEach((connection, userId) => {
                if (now - connection.lastSeen > timeout) {
                    console.log(`⏰ User ${userId} timed out`);
                    
                    // Mark as away
                    connection.status = 'away';
                    connection.lastSeen = now;
                }
            });
        }, 30000); // Check every 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Admin functions
    getStats() {
        return {
            connectedUsers: this.connectedUsers.size,
            onlineUsers: this.getOnlineUsersCount(),
            queuedMessages: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
            uptime: process.uptime()
        };
    }

    disconnectUser(userId) {
        const connection = this.connectedUsers.get(userId);
        if (connection) {
            // Force disconnect
            this.connectedUsers.delete(userId);
            this.userSockets.delete(connection.socketId);
            console.log(`🔌 Force disconnected user: ${userId}`);
        }
    }

    broadcastSystemMessage(message, targetUsers = null) {
        const systemMessage = {
            type: 'system',
            content: message,
            timestamp: new Date()
        };

        if (targetUsers) {
            targetUsers.forEach(userId => {
                const connection = this.connectedUsers.get(userId);
                if (connection) {
                    // Send to specific users
                }
            });
        } else {
            // Broadcast to all connected users
            this.connectedUsers.forEach((connection, userId) => {
                // Send system message
            });
        }
    }
}

module.exports = new AdvancedSocketService();