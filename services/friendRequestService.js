const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const mongoose = require('mongoose');

class FriendRequestService {
  
  // Send a friend request
  static async sendFriendRequest(senderId, receiverEmail, message = '') {
    try {
      console.log('FriendRequestService.sendFriendRequest called:', { senderId, receiverEmail, message });
      
      // Find the receiver by email
      const receiver = await User.findOne({ email: receiverEmail.toLowerCase().trim() });
      const sender = await User.findById(senderId);
      
      console.log('Users found:', { sender: !!sender, receiver: !!receiver });
      
      if (!sender || !receiver) {
        throw new Error('Sender or receiver not found');
      }
      
      if (senderId === receiver._id.toString()) {
        throw new Error('Cannot send friend request to yourself');
      }
      
      // Check if they are already friends
      if (sender.friends.includes(receiver._id)) {
        throw new Error('You are already friends with this user');
      }
      
      // Check if a pending request already exists
      const existingRequest = await FriendRequest.requestExists(senderId, receiver._id);
      if (existingRequest) {
        throw new Error('Friend request already sent or received');
      }
      
      // Create new friend request
      const friendRequest = new FriendRequest({
        sender: senderId,
        receiver: receiver._id,
        message: message.trim(),
        status: 'pending'
      });
      
      await friendRequest.save();
      
      // Populate sender info for response
      await friendRequest.populate('sender', 'fullName email personalInfo');
      await friendRequest.populate('receiver', 'fullName email personalInfo');
      
      console.log('Friend request sent successfully');
      return friendRequest;
      
    } catch (error) {
      console.error('Send friend request error:', {
        message: error.message,
        senderId,
        receiverEmail
      });
      throw error;
    }
  }
  
  // Get pending friend requests for a user (received)
  static async getPendingRequests(userId) {
    try {
      console.log('FriendRequestService.getPendingRequests called for user:', userId);
      
      const requests = await FriendRequest.getPendingRequests(userId);
      
      const formattedRequests = requests.map(request => ({
        _id: request._id,
        sender: {
          _id: request.sender._id,
          fullName: request.sender.fullName,
          firstName: request.sender.personalInfo?.firstName || request.sender.fullName.split(' ')[0],
          email: request.sender.email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(request.sender.fullName)}&background=6C63FF&color=fff`
        },
        message: request.message,
        createdAt: request.createdAt,
        expiresAt: request.expiresAt
      }));
      
      console.log('Pending requests found:', formattedRequests.length);
      return formattedRequests;
      
    } catch (error) {
      console.error('Get pending requests error:', error);
      throw error;
    }
  }
  
  // Get sent friend requests for a user
  static async getSentRequests(userId) {
    try {
      console.log('FriendRequestService.getSentRequests called for user:', userId);
      
      const requests = await FriendRequest.getSentRequests(userId);
      
      const formattedRequests = requests.map(request => ({
        _id: request._id,
        receiver: {
          _id: request.receiver._id,
          fullName: request.receiver.fullName,
          firstName: request.receiver.personalInfo?.firstName || request.receiver.fullName.split(' ')[0],
          email: request.receiver.email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(request.receiver.fullName)}&background=6C63FF&color=fff`
        },
        message: request.message,
        status: request.status,
        createdAt: request.createdAt,
        expiresAt: request.expiresAt
      }));
      
      console.log('Sent requests found:', formattedRequests.length);
      return formattedRequests;
      
    } catch (error) {
      console.error('Get sent requests error:', error);
      throw error;
    }
  }
  
  // Accept a friend request
  static async acceptFriendRequest(requestId, userId) {
    try {
      console.log('FriendRequestService.acceptFriendRequest called:', { requestId, userId });
      
      const request = await FriendRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Friend request not found');
      }
      
      // Only the receiver can accept the request
      if (request.receiver.toString() !== userId.toString()) {
        throw new Error('Not authorized to accept this request');
      }
      
      if (request.status !== 'pending') {
        throw new Error('Request is no longer pending');
      }
      
      // Accept the request (this will also add both users as friends)
      await request.accept();
      
      // Populate user info for response
      await request.populate('sender', 'fullName email personalInfo');
      await request.populate('receiver', 'fullName email personalInfo');
      
      console.log('Friend request accepted successfully');
      return request;
      
    } catch (error) {
      console.error('Accept friend request error:', error);
      throw error;
    }
  }
  
  // Reject a friend request
  static async rejectFriendRequest(requestId, userId) {
    try {
      console.log('FriendRequestService.rejectFriendRequest called:', { requestId, userId });
      
      const request = await FriendRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Friend request not found');
      }
      
      // Only the receiver can reject the request
      if (request.receiver.toString() !== userId.toString()) {
        throw new Error('Not authorized to reject this request');
      }
      
      if (request.status !== 'pending') {
        throw new Error('Request is no longer pending');
      }
      
      // Reject the request
      await request.reject();
      
      console.log('Friend request rejected successfully');
      return request;
      
    } catch (error) {
      console.error('Reject friend request error:', error);
      throw error;
    }
  }
  
  // Cancel a sent friend request
  static async cancelFriendRequest(requestId, userId) {
    try {
      console.log('FriendRequestService.cancelFriendRequest called:', { requestId, userId });
      
      const request = await FriendRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Friend request not found');
      }
      
      // Only the sender can cancel the request
      if (request.sender.toString() !== userId.toString()) {
        throw new Error('Not authorized to cancel this request');
      }
      
      if (request.status !== 'pending') {
        throw new Error('Request is no longer pending');
      }
      
      // Cancel the request
      await request.cancel();
      
      console.log('Friend request cancelled successfully');
      return request;
      
    } catch (error) {
      console.error('Cancel friend request error:', error);
      throw error;
    }
  }
  
  // Check if users can chat (are friends)
  static async canUsersChat(userId1, userId2) {
    try {
      const user1 = await User.findById(userId1);
      const user2 = await User.findById(userId2);
      
      if (!user1 || !user2) {
        return false;
      }
      
      // Check if they are friends
      return user1.friends.includes(userId2) && user2.friends.includes(userId1);
      
    } catch (error) {
      console.error('Check if users can chat error:', error);
      return false;
    }
  }
  
  // Get friendship status between two users
  static async getFriendshipStatus(userId1, userId2) {
    try {
      const user1 = await User.findById(userId1);
      const user2 = await User.findById(userId2);
      
      if (!user1 || !user2) {
        return 'unknown';
      }
      
      // Check if they are friends
      if (user1.friends.includes(userId2) && user2.friends.includes(userId1)) {
        return 'friends';
      }
      
      // Check for the most recent request between users
      const request = await FriendRequest.findOne({
        $or: [
          { sender: userId1, receiver: userId2 },
          { sender: userId2, receiver: userId1 }
        ]
      }).sort({ createdAt: -1 }); // Get the most recent request
      
      if (request) {
        if (request.status === 'pending') {
          if (request.sender.toString() === userId1.toString()) {
            return 'request_sent';
          } else {
            return 'request_received';
          }
        } else if (request.status === 'rejected') {
          return 'rejected';
        } else if (request.status === 'cancelled') {
          return 'cancelled';
        }
      }
      
      return 'not_friends';
      
    } catch (error) {
      console.error('Get friendship status error:', error);
      return 'unknown';
    }
  }
}

module.exports = FriendRequestService;