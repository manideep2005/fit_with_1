const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

let io = null;

class ChatService {

  static init(socketIoInstance) {
    io = socketIoInstance;
    console.log('ChatService initialized with Socket.IO');
  }
  
  // Send a message between friends
  static async sendMessage(senderId, receiverId, content, messageType = 'text', attachmentData = null) {
    try {
      console.log('ChatService.sendMessage called:', { senderId, receiverId, content, messageType });
      
      // Validate input parameters
      if (!senderId || !receiverId || !content) {
        throw new Error('Sender ID, receiver ID, and content are required');
      }
      
      if (senderId.toString() === receiverId.toString()) {
        throw new Error('Cannot send message to yourself');
      }
      
      // Validate that both users exist and are friends
      const sender = await User.findById(senderId);
      const receiver = await User.findById(receiverId);
      
      console.log('Users found:', { sender: !!sender, receiver: !!receiver });
      
      if (!sender) {
        throw new Error('Sender not found');
      }
      
      if (!receiver) {
        throw new Error('Receiver not found');
      }
      
      // Check if they are friends - convert ObjectIds to strings for comparison
      const senderFriendsIds = sender.friends.map(friendId => friendId.toString());
      const receiverFriendsIds = receiver.friends.map(friendId => friendId.toString());
      
      const areFriends = senderFriendsIds.includes(receiverId.toString()) && 
                        receiverFriendsIds.includes(senderId.toString());
      
      console.log('Friendship check:', { 
        areFriends, 
        senderFriends: sender.friends.length, 
        receiverFriends: receiver.friends.length,
        senderFriendsIds,
        receiverFriendsIds,
        senderId: senderId.toString(),
        receiverId: receiverId.toString()
      });
      
      if (!areFriends) {
        throw new Error('You can only send messages to friends. Please send a friend request first.');
      }
      
      // Create conversation ID
      const conversationId = Message.createConversationId(senderId, receiverId);
      console.log('Conversation ID created:', conversationId);
      
      // Create message
      const message = new Message({
        sender: senderId,
        receiver: receiverId,
        content: content.trim(),
        messageType: messageType,
        attachmentData: attachmentData,
        conversationId: conversationId,
        status: 'sent'
      });
      
      console.log('Message object created, saving...');
      await message.save();
      console.log('Message saved successfully');
      
      // Populate sender and receiver info
      await message.populate('sender', 'fullName personalInfo.firstName personalInfo.lastName');
      await message.populate('receiver', 'fullName personalInfo.firstName personalInfo.lastName');

      if (io) {
        io.to(receiverId.toString()).emit('new message', message);
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
      
      // Provide more specific error messages for common issues
      if (error.name === 'CastError') {
        throw new Error('Invalid user ID format');
      }
      
      if (error.name === 'ValidationError') {
        throw new Error('Message validation failed: ' + error.message);
      }
      
      throw error;
    }
  }
  
  // Get conversation messages between two users
  static async getConversationMessages(userId1, userId2, limit = 50, skip = 0) {
    try {
      console.log('ChatService.getConversationMessages called:', { userId1, userId2, limit, skip });
      const messages = await Message.getConversationMessages(userId1, userId2, limit, skip);
      console.log('Messages retrieved:', messages.length);
      return messages.reverse(); // Return in chronological order (oldest first)
    } catch (error) {
      console.error('Get conversation messages error:', error);
      throw error;
    }
  }
  
  // Mark messages as read
  static async markMessagesAsRead(userId1, userId2, readerId) {
    try {
      const result = await Message.markAsRead(userId1, userId2, readerId);
      return result;
    } catch (error) {
      console.error('Mark messages as read error:', error);
      throw error;
    }
  }
  
  // Get user's conversations list
  static async getUserConversations(userId) {
    try {
      console.log('ChatService.getUserConversations called for user:', userId);
      const conversations = await Message.getUserConversations(userId);
      console.log('Raw conversations from DB:', conversations.length);
      
      // Process conversations to get friend info
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
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(friendInfo.fullName)}&background=6C63FF&color=fff`
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
  
  // Accept friend request
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
      
      return true;
    } catch (error) {
      console.error('Remove friend error:', error);
      throw error;
    }
  }
  
  // Get user's friends list
  static async getUserFriends(userId) {
    try {
      console.log('ChatService.getUserFriends called for user:', userId);
      const user = await User.findById(userId).populate('friends', 'fullName email personalInfo');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      const friends = user.friends.map(friend => ({
        _id: friend._id,
        fullName: friend.fullName,
        firstName: friend.personalInfo?.firstName || friend.fullName.split(' ')[0],
        email: friend.email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName)}&background=6C63FF&color=fff`,
        isOnline: false // Can be enhanced with real-time presence
      }));
      
      console.log('Friends found:', friends.length);
      return friends;
    } catch (error) {
      console.error('Get user friends error:', error);
      throw error;
    }
  }
  
  // Search users to add as friends
  static async searchUsers(currentUserId, searchQuery, limit = 10) {
    try {
      console.log('ChatService.searchUsers called:', { currentUserId, searchQuery, limit });
      
      const currentUser = await User.findById(currentUserId);
      
      if (!currentUser) {
        throw new Error('Current user not found');
      }
      
      // Search by name or email
      const searchRegex = new RegExp(searchQuery, 'i');
      const users = await User.find({
        _id: { $ne: currentUserId }, // Exclude current user
        $or: [
          { fullName: searchRegex },
          { email: searchRegex },
          { 'personalInfo.firstName': searchRegex },
          { 'personalInfo.lastName': searchRegex }
        ]
      })
      .select('fullName email personalInfo')
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
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=6C63FF&color=fff`,
          friendshipStatus: friendshipStatus,
          isFriend: friendshipStatus === 'friends'
        };
      }));
      
      console.log('Search results:', results.length);
      return results;
    } catch (error) {
      console.error('Search users error:', error);
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
}

module.exports = ChatService;