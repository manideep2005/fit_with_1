const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

let io = null;

class ChatService {

  static init(socketIoInstance) {
    io = socketIoInstance;
    console.log('ChatService initialized with Socket.IO');
    
    // Only set up Socket.IO event handlers if io is available (not in serverless environment)
    if (io && typeof io.on === 'function') {
      console.log('Setting up Socket.IO event handlers');
      io.on('connection', (socket) => {
        console.log('User connected:', socket.id);
        
        // Handle user going online
        socket.on('user_online', async (userId) => {
          try {
            await User.findByIdAndUpdate(userId, {
              isOnline: true,
              lastSeen: new Date(),
              socketId: socket.id
            });
            
            // Notify friends that user is online
            const user = await User.findById(userId).populate('friends', '_id');
            if (user && user.friends) {
              user.friends.forEach(friend => {
                socket.to(friend._id.toString()).emit('friend_online', {
                  userId: userId,
                  isOnline: true
                });
              });
            }
          } catch (error) {
            console.error('Error updating user online status:', error);
          }
        });
        
        // Handle typing indicators
        socket.on('typing_start', (data) => {
          socket.to(data.receiverId).emit('user_typing', {
            senderId: data.senderId,
            isTyping: true
          });
        });
        
        socket.on('typing_stop', (data) => {
          socket.to(data.receiverId).emit('user_typing', {
            senderId: data.senderId,
            isTyping: false
          });
        });
        
        // Handle message read receipts
        socket.on('message_read', async (data) => {
          try {
            await Message.findByIdAndUpdate(data.messageId, {
              status: 'read',
              readAt: new Date()
            });
            
            socket.to(data.senderId).emit('message_read_receipt', {
              messageId: data.messageId,
              readAt: new Date()
            });
          } catch (error) {
            console.error('Error updating message read status:', error);
          }
        });
        
        // Handle call events
        socket.on('incoming_call', (data) => {
          socket.to(data.receiverId).emit('incoming_call', data);
        });
        
        socket.on('call_accepted', (data) => {
          socket.to(data.callerId).emit('call_accepted', data);
        });
        
        socket.on('call_rejected', (data) => {
          socket.to(data.callerId).emit('call_rejected', data);
        });
        
        socket.on('call_ended', (data) => {
          socket.to(data.participantId).emit('call_ended', data);
        });
        
        // Handle WebRTC signaling
        socket.on('webrtc_offer', (data) => {
          socket.to(data.receiverId).emit('webrtc_offer', data);
        });
        
        socket.on('webrtc_answer', (data) => {
          socket.to(data.senderId).emit('webrtc_answer', data);
        });
        
        socket.on('webrtc_ice_candidate', (data) => {
          socket.to(data.receiverId).emit('webrtc_ice_candidate', data);
        });
        
        // Handle user disconnect
        socket.on('disconnect', async () => {
          try {
            // Find user by socket ID and update offline status
            const user = await User.findOneAndUpdate(
              { socketId: socket.id },
              {
                isOnline: false,
                lastSeen: new Date(),
                socketId: null
              }
            ).populate('friends', '_id');
            
            if (user && user.friends) {
              // Notify friends that user is offline
              user.friends.forEach(friend => {
                socket.to(friend._id.toString()).emit('friend_offline', {
                  userId: user._id,
                  isOnline: false,
                  lastSeen: new Date()
                });
              });
            }
          } catch (error) {
            console.error('Error updating user offline status:', error);
          }
          
          console.log('User disconnected:', socket.id);
        });
      });
    } else {
      console.log('Socket.IO not available - running in serverless mode (Vercel)');
    }
  }
  
  static async sendMessage(senderId, receiverId, content, messageType = 'text', attachmentData = null) {
    try {
      console.log('ChatService.sendMessage called:', { senderId, receiverId, content, messageType });
      
      // Validate input parameters
      if (!senderId || !receiverId || !content) {
        throw new Error('Sender ID, receiver ID, and content are required');
      }
      
      const receiverType = 'User'; // Default to User for now
      
      if (senderId.toString() === receiverId.toString()) {
        throw new Error('Cannot send message to yourself');
      }
      
      const sender = await User.findById(senderId);
      const receiver = await User.findById(receiverId);
      if (!sender || !receiver) {
        throw new Error('Sender or receiver not found');
      }
      
      const senderFriendsIds = sender.friends.map(friendId => friendId.toString());
      if (!senderFriendsIds.includes(receiverId.toString())) {
        throw new Error('You can only send messages to friends. Please send a friend request first.');
      }
      
      const conversationId = Message.createConversationId(senderId, receiverId);
      const messageData = {
        sender: senderId,
        receiver: receiverId,
        receiverType: 'User',
        content: content.trim(),
        messageType: messageType,
        attachmentData: attachmentData,
        status: 'sent',
        conversationId: conversationId
      };

      const message = new Message(messageData);
      
      console.log('Message object created, saving...');
      await message.save();
      console.log('Message saved successfully');
      
      await message.populate('sender', 'fullName personalInfo.firstName personalInfo.lastName isOnline lastSeen');

      // Send real-time notification to receiver (only if Socket.IO is available)
      if (io && typeof io.to === 'function') {
        io.to(receiverId.toString()).emit('new_message', {
          ...message.toObject(),
          senderInfo: {
            _id: sender._id,
            fullName: sender.fullName,
            isOnline: sender.isOnline,
            lastSeen: sender.lastSeen
          }
        });
        
        // Update message status to delivered if receiver is online
        if (receiver.isOnline) {
          message.status = 'delivered';
          await message.save();
        }
      }
      
      console.log('Message populated and ready to return');
      return message;
      
    } catch (error) {
      console.error('Send message error:', {
        message: error.message,
        stack: error.stack,
        senderId,
        receiverId,
        content: content?.substring(0, 50)
      });
      
      if (error.name === 'CastError') {
        throw new Error('Invalid user or group ID format');
      }
      
      if (error.name === 'ValidationError') {
        throw new Error('Message validation failed: ' + error.message);
      }
      
      throw error;
    }
  }
  
  static async getMessages(userId, conversationId, conversationType, limit = 50, skip = 0) {
    try {
      console.log('ChatService.getMessages called:', { userId, conversationId, conversationType, limit, skip });
      let query = {
        conversationId: conversationId,
        isDeleted: false
      };

      const messages = await Message.find(query)
        .populate('sender', 'fullName isOnline lastSeen')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const processedMessages = messages.map(message => ({
        ...message.toObject(),
        isSender: message.sender._id.toString() === userId.toString(),
        senderName: message.sender.fullName,
        senderOnlineStatus: {
          isOnline: message.sender.isOnline,
          lastSeen: message.sender.lastSeen
        }
      }));

      console.log('Messages retrieved:', processedMessages.length);
      return processedMessages.reverse();
    } catch (error) {
      console.error('Get messages error:', error);
      throw error;
    }
  }
  
  // Get conversation messages between two users
  static async getConversationMessages(userId, friendId, limit = 50, skip = 0) {
    try {
      console.log('ChatService.getConversationMessages called:', { userId, friendId, limit, skip });
      
      const conversationId = Message.createConversationId(userId, friendId);
      
      const messages = await Message.find({
        conversationId: conversationId,
        isDeleted: false
      })
      .populate('sender', 'fullName personalInfo.firstName personalInfo.lastName isOnline lastSeen')
      .sort({ createdAt: 1 }) // Ascending order for chat display
      .limit(limit)
      .skip(skip);

      const processedMessages = messages.map(message => ({
        _id: message._id,
        content: message.content,
        messageType: message.messageType,
        createdAt: message.createdAt,
        isSender: message.sender._id.toString() === userId.toString(),
        senderName: message.sender.fullName,
        status: message.status,
        readAt: message.readAt,
        senderOnlineStatus: {
          isOnline: message.sender.isOnline,
          lastSeen: message.sender.lastSeen
        }
      }));

      console.log('Conversation messages retrieved:', processedMessages.length);
      return processedMessages;
    } catch (error) {
      console.error('Get conversation messages error:', error);
      throw error;
    }
  }
  
  // Mark messages as read
  static async markMessagesAsRead(userId1, userId2, readerId) {
    try {
      const result = await Message.markAsRead(userId1, userId2, readerId);
      
      // Notify sender about read receipts via Socket.IO (only if available)
      if (io && typeof io.to === 'function') {
        const conversationId = Message.createConversationId(userId1, userId2);
        const senderId = userId1.toString() === readerId.toString() ? userId2 : userId1;
        
        io.to(senderId.toString()).emit('messages_read', {
          conversationId: conversationId,
          readBy: readerId,
          readAt: new Date()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Mark messages as read error:', error);
      throw error;
    }
  }
  
  // Get user's conversations list with online status
  static async getUserConversations(userId) {
    try {
      console.log('ChatService.getUserConversations called for user:', userId);
      const conversations = await Message.getUserConversations(userId);
      console.log('Raw conversations from DB:', conversations.length);
      
      // Process conversations to get friend info with online status
      const processedConversations = conversations.map(conv => {
        const lastMessage = conv.lastMessage;
        const isCurrentUserSender = lastMessage.sender.toString() === userId.toString();
        
        // Get the other person in the conversation
        const friendInfo = isCurrentUserSender ? 
          conv.receiverInfo[0] : 
          conv.senderInfo[0];
        
        return {
          conversationId: conv._id,
          friend: {
            _id: friendInfo._id,
            fullName: friendInfo.fullName,
            firstName: friendInfo.personalInfo?.firstName || friendInfo.fullName.split(' ')[0],
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(friendInfo.fullName)}&background=6C63FF&color=fff`,
            isOnline: friendInfo.isOnline || false,
            lastSeen: friendInfo.lastSeen
          },
          lastMessage: {
            content: lastMessage.content,
            messageType: lastMessage.messageType,
            timestamp: lastMessage.createdAt,
            isFromCurrentUser: isCurrentUserSender,
            status: lastMessage.status
          },
          unreadCount: conv.unreadCount
        };
      });
      
      console.log('Processed conversations:', processedConversations.length);
      return processedConversations;
    } catch (error) {
      console.error('Get user conversations error:', error);
      throw error;
    }
  }
  
  // Get unread message count for a user
  static async getUnreadMessageCount(userId) {
    try {
      const count = await Message.getUnreadCount(userId);
      return count;
    } catch (error) {
      console.error('Get unread message count error:', error);
      throw error;
    }
  }
  
  // Send friend request (replaces direct friend addition)
  static async sendFriendRequest(userId, friendEmail, message = '') {
    try {
      console.log('ChatService.sendFriendRequest called:', { userId, friendEmail, message });
      
      const FriendRequestService = require('./friendRequestService');
      return await FriendRequestService.sendFriendRequest(userId, friendEmail, message);
      
    } catch (error) {
      console.error('Send friend request error:', error);
      throw error;
    }
  }
  
  // Legacy method for backward compatibility - now sends friend request
  static async addFriend(userId, friendEmail) {
    try {
      console.log('ChatService.addFriend called (legacy) - sending friend request instead');
      return await this.sendFriendRequest(userId, friendEmail, 'Hi! I would like to connect with you.');
    } catch (error) {
      console.error('Add friend (legacy) error:', error);
      throw error;
    }
  }
  
  // Get pending friend requests
  static async getPendingFriendRequests(userId) {
    try {
      const FriendRequestService = require('./friendRequestService');
      return await FriendRequestService.getPendingRequests(userId);
    } catch (error) {
      console.error('Get pending friend requests error:', error);
      throw error;
    }
  }
  
  // Get sent friend requests
  static async getSentFriendRequests(userId) {
    try {
      const FriendRequestService = require('./friendRequestService');
      return await FriendRequestService.getSentRequests(userId);
    } catch (error) {
      console.error('Get sent friend requests error:', error);
      throw error;
    }
  }
  
  
  static async acceptFriendRequest(requestId, userId) {
    try {
      const FriendRequestService = require('./friendRequestService');
      return await FriendRequestService.acceptFriendRequest(requestId, userId);
    } catch (error) {
      console.error('Accept friend request error:', error);
      throw error;
    }
  }
  
  // Reject friend request
  static async rejectFriendRequest(requestId, userId) {
    try {
      const FriendRequestService = require('./friendRequestService');
      return await FriendRequestService.rejectFriendRequest(requestId, userId);
    } catch (error) {
      console.error('Reject friend request error:', error);
      throw error;
    }
  }
  
  // Check friendship status
  static async getFriendshipStatus(userId1, userId2) {
    try {
      const FriendRequestService = require('./friendRequestService');
      return await FriendRequestService.getFriendshipStatus(userId1, userId2);
    } catch (error) {
      console.error('Get friendship status error:', error);
      throw error;
    }
  }
  
  // Remove friend
  static async removeFriend(userId, friendId) {
    try {
      const user = await User.findById(userId);
      const friend = await User.findById(friendId);
      
      if (!user || !friend) {
        throw new Error('User or friend not found');
      }
      
      // Remove from both users' friend lists
      user.friends = user.friends.filter(id => id.toString() !== friendId);
      friend.friends = friend.friends.filter(id => id.toString() !== userId);
      
      await user.save();
      await friend.save();
      
      // Clean up any existing friend requests between these users
      const FriendRequest = require('../models/FriendRequest');
      await FriendRequest.deleteMany({
        $or: [
          { sender: userId, receiver: friendId },
          { sender: friendId, receiver: userId }
        ]
      });
      
      return true;
    } catch (error) {
      console.error('Remove friend error:', error);
      throw error;
    }
  }
  
  // Get user's friends list with online status
  static async getUserFriends(userId) {
    try {
      console.log('ChatService.getUserFriends called for user:', userId);
      const user = await User.findById(userId).populate('friends', 'fullName email personalInfo isOnline lastSeen');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      const friends = user.friends.map(friend => ({
        _id: friend._id,
        fullName: friend.fullName,
        firstName: friend.personalInfo?.firstName || friend.fullName.split(' ')[0],
        email: friend.email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName)}&background=6C63FF&color=fff`,
        isOnline: friend.isOnline || false,
        lastSeen: friend.lastSeen,
        status: friend.isOnline ? 'online' : this.getLastSeenText(friend.lastSeen)
      }));
      
      console.log('Friends found:', friends.length);
      return friends;
    } catch (error) {
      console.error('Get user friends error:', error);
      throw error;
    }
  }
  
  // Helper method to format last seen text
  static getLastSeenText(lastSeen) {
    if (!lastSeen) return 'Last seen a while ago';
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Last seen just now';
    if (diffMins < 60) return `Last seen ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `Last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `Last seen ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return `Last seen on ${lastSeenDate.toLocaleDateString()}`;
  }
  
  // Search users to add as friends
  static async searchUsers(currentUserId, searchQuery, limit = 10) {
    try {
      console.log('ChatService.searchUsers called:', { currentUserId, searchQuery, limit });
      
      const currentUser = await User.findById(currentUserId);
      
      if (!currentUser) {
        throw new Error('Current user not found');
      }
      
      // Search by name, email, or fitness ID
      const searchRegex = new RegExp(searchQuery, 'i');
      const users = await User.find({
        _id: { $ne: currentUserId }, // Exclude current user
        $or: [
          { fullName: searchRegex },
          { email: searchRegex },
          { fitnessId: searchRegex },
          { 'personalInfo.firstName': searchRegex },
          { 'personalInfo.lastName': searchRegex }
        ]
      })
      .select('fullName email personalInfo fitnessId isOnline lastSeen')
      .limit(limit);
      
      // Get friendship status for each user
      const FriendRequestService = require('./friendRequestService');
      const results = await Promise.all(users.map(async (user) => {
        const friendshipStatus = await FriendRequestService.getFriendshipStatus(currentUserId, user._id);
        
        return {
          _id: user._id,
          fullName: user.fullName,
          firstName: user.personalInfo?.firstName || user.fullName.split(' ')[0],
          email: user.email,
          fitnessId: user.fitnessId,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=6C63FF&color=fff`,
          friendshipStatus: friendshipStatus,
          isFriend: friendshipStatus === 'friends',
          isOnline: user.isOnline || false,
          lastSeen: user.lastSeen,
          status: user.isOnline ? 'online' : this.getLastSeenText(user.lastSeen)
        };
      }));
      
      console.log('Search results:', results.length);
      return results;
    } catch (error) {
      console.error('Search users error:', error);
      throw error;
    }
  }
  
  // Initiate video call
  static async initiateVideoCall(callerId, receiverId) {
    try {
      const caller = await User.findById(callerId).select('fullName');
      const receiver = await User.findById(receiverId).select('fullName isOnline');
      
      if (!caller || !receiver) {
        throw new Error('Caller or receiver not found');
      }
      
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Send real-time notification if Socket.IO is available
      if (io && typeof io.to === 'function') {
        io.to(receiverId.toString()).emit('incoming_call', {
          callerId: callerId,
          caller: {
            id: callerId,
            name: caller.fullName
          },
          callId: callId,
          callType: 'video'
        });
      }
      
      return { callId, success: true };
    } catch (error) {
      console.error('Initiate video call error:', error);
      throw error;
    }
  }
  
  // Initiate audio call
  static async initiateAudioCall(callerId, receiverId) {
    try {
      const caller = await User.findById(callerId).select('fullName');
      const receiver = await User.findById(receiverId).select('fullName isOnline');
      
      if (!caller || !receiver) {
        throw new Error('Caller or receiver not found');
      }
      
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Send real-time notification if Socket.IO is available
      if (io && typeof io.to === 'function') {
        io.to(receiverId.toString()).emit('incoming_call', {
          callerId: callerId,
          caller: {
            id: callerId,
            name: caller.fullName
          },
          callId: callId,
          callType: 'audio'
        });
      }
      
      return { callId, success: true };
    } catch (error) {
      console.error('Initiate audio call error:', error);
      throw error;
    }
  }
  
  // Share workout with friend
  static async shareWorkout(senderId, receiverId, workoutData) {
    try {
      const content = `Shared a workout: ${workoutData.type || 'Workout'} - ${workoutData.duration || 0} minutes`;
      
      return await this.sendMessage(
        senderId, 
        receiverId, 
        content, 
        'workout-share', 
        { workoutId: workoutData._id, workoutData: workoutData }
      );
    } catch (error) {
      console.error('Share workout error:', error);
      throw error;
    }
  }
  
  // Share progress with friend
  static async shareProgress(senderId, receiverId, progressData) {
    try {
      const content = `Shared progress update: ${progressData.type || 'Progress Update'}`;
      
      return await this.sendMessage(
        senderId, 
        receiverId, 
        content, 
        'progress-share', 
        { progressData: progressData }
      );
    } catch (error) {
      console.error('Share progress error:', error);
      throw error;
    }
  }
  
  // Delete message
  static async deleteMessage(messageId, userId) {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        throw new Error('Message not found');
      }
      
      // Only sender can delete their message
      if (message.sender.toString() !== userId) {
        throw new Error('Not authorized to delete this message');
      }
      
      await message.softDelete();
      return true;
    } catch (error) {
      console.error('Delete message error:', error);
      throw error;
    }
  }

  // Block friend
  static async blockFriend(userId, friendId) {
    try {
      const user = await User.findById(userId);
      const friend = await User.findById(friendId);
      
      if (!user || !friend) {
        throw new Error('User or friend not found');
      }
      
      // Add to blocked list if not already blocked
      if (!user.blockedUsers) {
        user.blockedUsers = [];
      }
      
      if (!user.blockedUsers.includes(friendId)) {
        user.blockedUsers.push(friendId);
      }
      
      // Remove from friends list
      user.friends = user.friends.filter(id => id.toString() !== friendId);
      friend.friends = friend.friends.filter(id => id.toString() !== userId);
      
      await user.save();
      await friend.save();
      
      // Clean up any existing friend requests between these users
      const FriendRequest = require('../models/FriendRequest');
      await FriendRequest.deleteMany({
        $or: [
          { sender: userId, receiver: friendId },
          { sender: friendId, receiver: userId }
        ]
      });
      
      return true;
    } catch (error) {
      console.error('Block friend error:', error);
      throw error;
    }
  }
  
  // Clear chat messages
  static async clearChat(userId, friendId) {
    try {
      const conversationId = Message.createConversationId(userId, friendId);
      
      // Soft delete all messages in the conversation for the current user
      await Message.updateMany(
        { 
          conversationId: conversationId,
          $or: [{ sender: userId }, { receiver: userId }]
        },
        { 
          $set: { 
            [`deletedBy.${userId}`]: true,
            [`deletedAt.${userId}`]: new Date()
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Clear chat error:', error);
      throw error;
    }
  }
  
  // Export chat messages
  static async exportChat(userId, friendId) {
    try {
      const friend = await User.findById(friendId).select('fullName');
      if (!friend) {
        throw new Error('Friend not found');
      }
      
      const messages = await this.getConversationMessages(userId, friendId, 1000, 0);
      
      let chatData = `Chat Export - ${friend.fullName}\n`;
      chatData += `Exported on: ${new Date().toLocaleString()}\n`;
      chatData += `Total Messages: ${messages.length}\n\n`;
      chatData += '='.repeat(50) + '\n\n';
      
      messages.forEach(message => {
        const timestamp = new Date(message.createdAt).toLocaleString();
        const sender = message.isSender ? 'You' : friend.fullName;
        chatData += `[${timestamp}] ${sender}: ${message.content}\n`;
      });
      
      return {
        chatData: chatData,
        friendName: friend.fullName.replace(/\s+/g, '_')
      };
    } catch (error) {
      console.error('Export chat error:', error);
      throw error;
    }
  }

  static async getContacts(userId) {
    const user = await User.findById(userId).populate('friends', 'fullName isOnline lastSeen').populate('groups', 'name');
    if (!user) {
        throw new Error('User not found');
    }

    const friends = user.friends.map(friend => ({
        id: friend._id,
        name: friend.fullName,
        type: 'User',
        isOnline: friend.isOnline || false,
        lastSeen: friend.lastSeen
    }));

    const groups = user.groups.map(group => ({
        id: group._id,
        name: group.name,
        type: 'Group'
    }));

    return [...friends, ...groups];
  }
}

module.exports = ChatService;