const crypto = require('crypto');

class LiveWorkoutService {
    constructor(io) {
        this.io = io;
        this.sessions = new Map();
        this.userSessions = new Map();
        this.isEnabled = !!io; // Only enable if Socket.IO is available
        
        console.log('LiveWorkoutService initialized:', {
            enabled: this.isEnabled,
            hasIO: !!io
        });
    }
    
    generateSessionId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 9; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result.substring(0, 3) + '-' + result.substring(3, 6) + '-' + result.substring(6, 9);
    }

    init(socket) {
        if (!this.isEnabled) {
            console.warn('LiveWorkoutService: Socket.IO not available, skipping initialization');
            return;
        }

        try {
            socket.on('create-live-workout', (data) => this.createSession(socket, data));
            socket.on('join-live-workout', (data) => this.joinSession(socket, data));
            socket.on('leave-live-workout', (data) => this.leaveSession(socket, data));
            socket.on('live-workout-chat', (data) => this.handleChat(socket, data));
            
            // WebRTC signaling events
            socket.on('webrtc-offer', (data) => this.handleWebRTCOffer(socket, data));
            socket.on('webrtc-answer', (data) => this.handleWebRTCAnswer(socket, data));
            socket.on('webrtc-ice-candidate', (data) => this.handleWebRTCIceCandidate(socket, data));
            
            console.log('LiveWorkoutService: Socket events initialized for', socket.id);
        } catch (error) {
            console.error('LiveWorkoutService: Error initializing socket events:', error);
        }
    }

    createSession(socket, { userId, userName, workoutTitle = 'Live Workout Session' }) {
        if (!this.isEnabled) {
            return socket.emit('live-workout-error', { 
                message: 'Live workout service is not available in this environment' 
            });
        }

        try {
            const sessionId = this.generateSessionId();
            const session = {
                id: sessionId,
                title: workoutTitle,
                hostId: userId,
                hostName: userName,
                participants: new Map(),
                chatHistory: [],
                createdAt: new Date(),
                isActive: true,
                webrtcConnections: new Map() // Track WebRTC connections
            };
            
            this.sessions.set(sessionId, session);
            this.userSessions.set(userId, sessionId);

            session.participants.set(socket.id, { 
                userId, 
                userName, 
                isHost: true,
                joinedAt: new Date(),
                isConnected: true,
                socketId: socket.id
            });

            socket.join(sessionId);
            socket.sessionId = sessionId;
            socket.userId = userId;
            
            socket.emit('live-workout-created', { 
                sessionId,
                session: {
                    id: sessionId,
                    title: workoutTitle,
                    hostName: userName,
                    participantCount: 1,
                    isHost: true
                }
            });
            
            console.log(`LiveWorkoutService: Session created - ${sessionId} by ${userName}`);
            return sessionId;
        } catch (error) {
            console.error('LiveWorkoutService: Error creating session:', error);
            socket.emit('live-workout-error', { 
                message: 'Failed to create workout session' 
            });
        }
    }

    joinSession(socket, { sessionId, userId, userName }) {
        if (!this.isEnabled) {
            return socket.emit('live-workout-error', { 
                message: 'Live workout service is not available in this environment' 
            });
        }

        try {
            const session = this.sessions.get(sessionId);
            if (!session || !session.isActive) {
                return socket.emit('live-workout-error', { 
                    message: 'Session not found or has ended' 
                });
            }

            // Check if user is already in session
            const existingParticipant = Array.from(session.participants.values())
                .find(p => p.userId === userId);
            
            if (existingParticipant) {
                // Update existing participant's socket
                session.participants.delete(existingParticipant.socketId);
                session.participants.set(socket.id, {
                    ...existingParticipant,
                    socketId: socket.id,
                    isConnected: true,
                    rejoinedAt: new Date()
                });
            } else {
                // Add new participant
                session.participants.set(socket.id, { 
                    userId, 
                    userName,
                    isHost: false,
                    joinedAt: new Date(),
                    isConnected: true,
                    socketId: socket.id
                });
            }
            
            socket.join(sessionId);
            socket.sessionId = sessionId;
            socket.userId = userId;
            this.userSessions.set(userId, sessionId);

            // Notify other participants
            socket.to(sessionId).emit('user-joined-live-workout', { 
                userId, 
                userName, 
                socketId: socket.id,
                participantCount: session.participants.size
            });

            // Send session data to joining user
            const participants = Array.from(session.participants.values());
            socket.emit('live-workout-joined', {
                sessionId,
                session: {
                    id: sessionId,
                    title: session.title,
                    hostName: session.hostName,
                    participantCount: session.participants.size,
                    isHost: session.hostId === userId
                },
                participants: participants.map(p => ({
                    userId: p.userId,
                    userName: p.userName,
                    isHost: p.isHost,
                    isConnected: p.isConnected
                })),
                chatHistory: session.chatHistory.slice(-50) // Last 50 messages
            });
            
            // Add welcome message
            const welcomeMessage = {
                type: 'system',
                message: `${userName} joined the workout`,
                timestamp: new Date(),
                id: crypto.randomUUID()
            };
            session.chatHistory.push(welcomeMessage);
            
            // Broadcast welcome message
            this.io.to(sessionId).emit('live-workout-chat', welcomeMessage);
            
            console.log(`LiveWorkoutService: ${userName} joined session ${sessionId} (${session.participants.size} participants)`);
        } catch (error) {
            console.error('LiveWorkoutService: Error joining session:', error);
            socket.emit('live-workout-error', { 
                message: 'Failed to join workout session' 
            });
        }
    }

    leaveSession(socket, { sessionId }) {
        if (!this.isEnabled) return;

        try {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            const participant = session.participants.get(socket.id);
            if (participant) {
                session.participants.delete(socket.id);
                
                // Notify other participants
                socket.to(sessionId).emit('user-left-live-workout', { 
                    userId: participant.userId, 
                    userName: participant.userName, 
                    socketId: socket.id,
                    participantCount: session.participants.size
                });
                
                // Add leave message
                const leaveMessage = {
                    type: 'system',
                    message: `${participant.userName} left the workout`,
                    timestamp: new Date(),
                    id: crypto.randomUUID()
                };
                session.chatHistory.push(leaveMessage);
                this.io.to(sessionId).emit('live-workout-chat', leaveMessage);
                
                console.log(`LiveWorkoutService: ${participant.userName} left session ${sessionId}`);
            }

            // Handle host transfer or session cleanup
            if (session.hostId === participant?.userId && session.participants.size > 0) {
                // Transfer host to next participant
                const newHost = session.participants.values().next().value;
                session.hostId = newHost.userId;
                newHost.isHost = true;
                
                this.io.to(sessionId).emit('live-workout-host-changed', { 
                    newHostId: newHost.userId,
                    newHostName: newHost.userName
                });
                
                console.log(`LiveWorkoutService: Host transferred to ${newHost.userName} in session ${sessionId}`);
            } else if (session.participants.size === 0) {
                // Clean up empty session
                this.sessions.delete(sessionId);
                console.log(`LiveWorkoutService: Session ${sessionId} ended - no participants remaining`);
            }
        } catch (error) {
            console.error('LiveWorkoutService: Error leaving session:', error);
        }
    }

    handleChat(socket, { sessionId, message, type = 'user' }) {
        if (!this.isEnabled) return;

        try {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            const participant = session.participants.get(socket.id);
            if (participant && message && message.trim()) {
                const chatMessage = {
                    id: crypto.randomUUID(),
                    type: type,
                    userId: participant.userId,
                    userName: participant.userName,
                    message: message.trim(),
                    timestamp: new Date(),
                    isHost: participant.isHost
                };
                
                // Add to session history
                session.chatHistory.push(chatMessage);
                
                // Keep only last 100 messages
                if (session.chatHistory.length > 100) {
                    session.chatHistory = session.chatHistory.slice(-100);
                }
                
                // Broadcast to all participants
                this.io.to(sessionId).emit('live-workout-chat', chatMessage);
                
                console.log(`LiveWorkoutService: Chat message in ${sessionId} from ${participant.userName}: ${message.substring(0, 50)}...`);
            }
        } catch (error) {
            console.error('LiveWorkoutService: Error handling chat:', error);
        }
    }

    // WebRTC signaling methods
    handleWebRTCOffer(socket, { sessionId, targetUserId, offer }) {
        if (!this.isEnabled) return;

        try {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            // Find target participant's socket
            const targetParticipant = Array.from(session.participants.values())
                .find(p => p.userId === targetUserId);

            if (targetParticipant) {
                this.io.to(targetParticipant.socketId).emit('webrtc-offer', {
                    fromUserId: socket.userId,
                    offer: offer
                });
                
                console.log(`LiveWorkoutService: WebRTC offer sent from ${socket.userId} to ${targetUserId}`);
            }
        } catch (error) {
            console.error('LiveWorkoutService: Error handling WebRTC offer:', error);
        }
    }

    handleWebRTCAnswer(socket, { sessionId, targetUserId, answer }) {
        if (!this.isEnabled) return;

        try {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            const targetParticipant = Array.from(session.participants.values())
                .find(p => p.userId === targetUserId);

            if (targetParticipant) {
                this.io.to(targetParticipant.socketId).emit('webrtc-answer', {
                    fromUserId: socket.userId,
                    answer: answer
                });
                
                console.log(`LiveWorkoutService: WebRTC answer sent from ${socket.userId} to ${targetUserId}`);
            }
        } catch (error) {
            console.error('LiveWorkoutService: Error handling WebRTC answer:', error);
        }
    }

    handleWebRTCIceCandidate(socket, { sessionId, targetUserId, candidate }) {
        if (!this.isEnabled) return;

        try {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            const targetParticipant = Array.from(session.participants.values())
                .find(p => p.userId === targetUserId);

            if (targetParticipant) {
                this.io.to(targetParticipant.socketId).emit('webrtc-ice-candidate', {
                    fromUserId: socket.userId,
                    candidate: candidate
                });
            }
        } catch (error) {
            console.error('LiveWorkoutService: Error handling WebRTC ICE candidate:', error);
        }
    }

    handleDisconnect(socket) {
        if (!this.isEnabled) return;

        try {
            const sessionId = socket.sessionId;
            const userId = socket.userId;
            
            if (sessionId && userId) {
                console.log(`LiveWorkoutService: Handling disconnect for user ${userId} in session ${sessionId}`);
                this.leaveSession(socket, { sessionId });
                
                // Clean up user session mapping
                this.userSessions.delete(userId);
            }
        } catch (error) {
            console.error('LiveWorkoutService: Error handling disconnect:', error);
        }
    }

    // Utility methods
    getSessionInfo(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        
        return {
            id: session.id,
            title: session.title,
            hostName: session.hostName,
            participantCount: session.participants.size,
            isActive: session.isActive,
            createdAt: session.createdAt,
            participants: Array.from(session.participants.values()).map(p => ({
                userId: p.userId,
                userName: p.userName,
                isHost: p.isHost,
                isConnected: p.isConnected,
                joinedAt: p.joinedAt
            }))
        };
    }

    getAllActiveSessions() {
        return Array.from(this.sessions.values()).map(session => ({
            id: session.id,
            title: session.title,
            hostName: session.hostName,
            participantCount: session.participants.size,
            createdAt: session.createdAt
        }));
    }

    getUserSession(userId) {
        const sessionId = this.userSessions.get(userId);
        return sessionId ? this.getSessionInfo(sessionId) : null;
    }

    // Health check method
    healthCheck() {
        return {
            isEnabled: this.isEnabled,
            activeSessions: this.sessions.size,
            totalParticipants: Array.from(this.sessions.values())
                .reduce((total, session) => total + session.participants.size, 0),
            hasIO: !!this.io
        };
    }
}

module.exports = LiveWorkoutService;