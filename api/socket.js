import { Server } from 'socket.io';

let io;

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.IO server...');
    
    io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST']
      }
    });

    // Store connected users
    const connectedUsers = new Map();
    const lastSeenMap = new Map();
------- REPLACE

    io.on('connection', (socket) => {
      console.log('New Socket.IO connection:', socket.id);

      socket.on('register', (data) => {
        connectedUsers.set(data.userId, socket.id);
        socket.userId = data.userId;
        console.log(`User ${data.userId} registered`);
        
        // Broadcast presence online
        io.emit('presence', { userId: data.userId, online: true });
        
        // Send current online users to this socket
        for (const [uid] of connectedUsers) {
          socket.emit('presence', { userId: uid, online: true });
        }
      });
------- REPLACE

      socket.on('call-request', (data) => {
        const targetSocketId = connectedUsers.get(data.to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('incoming-call', {
            from: data.from,
            callId: data.callId,
            isVideo: data.isVideo
          });
        }
      });

      socket.on('call-accept', (data) => {
        const targetSocketId = connectedUsers.get(data.to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('call-accepted', {
            callId: data.callId,
            from: data.from
          });
        }
      });

      socket.on('call-reject', (data) => {
        const targetSocketId = connectedUsers.get(data.to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('call-rejected', {
            callId: data.callId
          });
        }
      });

      socket.on('call-offer', (data) => {
        const targetSocketId = connectedUsers.get(data.to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('call-offer', {
            callId: data.callId,
            offer: data.offer,
            from: data.from
          });
        }
      });

      socket.on('call-answer', (data) => {
        const targetSocketId = connectedUsers.get(data.to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('call-answer', {
            callId: data.callId,
            answer: data.answer
          });
        }
      });

      socket.on('ice-candidate', (data) => {
        const targetSocketId = connectedUsers.get(data.to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('ice-candidate', {
            callId: data.callId,
            candidate: data.candidate
          });
        }
      });
      
      // Typing indicator events
      socket.on('typing', (data) => {
        const targetSocketId = connectedUsers.get(data.to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('typing', { from: socket.userId });
        }
      });
      
      socket.on('stop-typing', (data) => {
        const targetSocketId = connectedUsers.get(data.to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('stop-typing', { from: socket.userId });
        }
      });
      
      // Read receipt event relay
      socket.on('message-read', (data) => {
        // data: { to, messageId }
        const targetSocketId = connectedUsers.get(data.to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('message-read', { messageId: data.messageId, from: socket.userId });
        }
      });
------- REPLACE

      socket.on('call-end', (data) => {
        const targetSocketId = connectedUsers.get(data.to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('call-ended', {
            callId: data.callId
          });
        }
      });

      socket.on('disconnect', () => {
        if (socket.userId) {
          connectedUsers.delete(socket.userId);
          lastSeenMap.set(socket.userId, Date.now());
          io.emit('presence', { userId: socket.userId, online: false, lastSeen: lastSeenMap.get(socket.userId) });
          console.log(`User ${socket.userId} disconnected`);
        }
      });
------- REPLACE
    });

    res.socket.server.io = io;
  }

  res.end();
}