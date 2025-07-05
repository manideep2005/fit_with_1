const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');

class FriendRequestService {
  
  // Send friend request
  static async sendFriendRequest(senderId, receiverEmail, message = '') {
    try {
      console.log('FriendRequestService.sendFriendRequest:', { senderId, receiverEmail });
      
      // Find receiver by email
      const receiver = await User.findOne({ email: receiverEmail.toLowerCase().trim() });
      if (!receiver) {
        throw new Error('User not found with this email address');
      }
      
      const receiverId = receiver._id;
      
      // Check if sender and receiver are the same
      if (senderId.toString() === receiverId.toString()) {
        throw new Error('Cannot send friend request to yourself');
      }
      
      // Check if they're already friends
      const sender = await User.findById(senderId);
      if (!sender) {
        throw new Error('Sender not found');
      }
      
      // Convert friends array to string IDs for comparison
      const senderFriendsIds = sender.friends.map(friendId => friendId.toString());
      if (senderFriendsIds.includes(receiverId.toString())) {
        throw new Error('You are already friends with this user');
      }
      
      // Check for existing pending request (either direction)
      const existingRequest = await FriendRequest.findOne({
        $or: [
          { sender: senderId, receiver: receiverId, status: 'pending' },
          { sender: receiverId, receiver: senderId, status: 'pending' }
        ]
      });
      
      if (existingRequest) {
        if (existingRequest.sender.toString() === senderId.toString()) {
          throw new Error('You have already sent a friend request to this user');
        } else {
          throw new Error('This user has already sent you a friend request');
        }
      }
      
      // Create friend request
      const friendRequest = new FriendRequest({
        sender: senderId,
        receiver: receiverId,
        message: message.trim(),
        status: 'pending'
      });
      
      await friendRequest.save();
      await friendRequest.populate('sender', 'fullName email');
      await friendRequest.populate('receiver', 'fullName email');
      
      // Send friend request email notification
      try {
        const { sendFriendRequestEmail } = require('./emailService');
        await sendFriendRequestEmail(
          friendRequest.receiver.email,
          friendRequest.receiver.fullName,
          friendRequest.sender.fullName,
          message
        );
        console.log('Friend request email sent successfully');
      } catch (emailError) {
        console.error('Failed to send friend request email:', emailError);
        // Don't fail the request if email fails
      }
      
      return friendRequest;
    } catch (error) {
      console.error('Send friend request error:', error);
      throw error;
    }
  }
  
  // Get pending friend requests for a user
  static async getPendingRequests(userId) {
    try {
      const requests = await FriendRequest.find({
        receiver: userId,
        status: 'pending'
      })
      .populate('sender', 'fullName email personalInfo')
      .sort({ createdAt: -1 });
      
      return requests;
    } catch (error) {
      console.error('Get pending requests error:', error);
      throw error;
    }
  }
  
  // Get sent friend requests
  static async getSentRequests(userId) {
    try {
      const requests = await FriendRequest.find({
        sender: userId,
        status: 'pending'
      })
      .populate('receiver', 'fullName email personalInfo')
      .sort({ createdAt: -1 });
      
      return requests;
    } catch (error) {
      console.error('Get sent requests error:', error);
      throw error;
    }
  }
  
  // Accept friend request
  static async acceptFriendRequest(requestId, userId) {
    try {
      const request = await FriendRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Friend request not found');
      }
      
      if (request.receiver.toString() !== userId.toString()) {
        throw new Error('Not authorized to accept this request');
      }
      
      if (request.status !== 'pending') {
        throw new Error('Request is no longer pending');
      }
      
      // Add to friends lists
      const sender = await User.findById(request.sender);
      const receiver = await User.findById(request.receiver);
      
      if (!sender || !receiver) {
        throw new Error('User not found');
      }
      
      // Convert friends arrays to string IDs for comparison
      const senderFriendsIds = sender.friends.map(friendId => friendId.toString());
      const receiverFriendsIds = receiver.friends.map(friendId => friendId.toString());
      
      // Add to friends list if not already there
      if (!senderFriendsIds.includes(request.receiver.toString())) {
        sender.friends.push(request.receiver);
        await sender.save();
      }
      
      if (!receiverFriendsIds.includes(request.sender.toString())) {
        receiver.friends.push(request.sender);
        await receiver.save();
      }
      
      // Update request status
      request.status = 'accepted';
      request.respondedAt = new Date();
      await request.save();
      
      // Send friend request accepted email notification
      try {
        const { sendFriendRequestAcceptedEmail } = require('./emailService');
        await sendFriendRequestAcceptedEmail(
          sender.email,
          sender.fullName,
          receiver.fullName
        );
        console.log('Friend request accepted email sent successfully');
      } catch (emailError) {
        console.error('Failed to send friend request accepted email:', emailError);
        // Don't fail the request if email fails
      }
      
      return request;
    } catch (error) {
      console.error('Accept friend request error:', error);
      throw error;
    }
  }
  
  // Reject friend request
  static async rejectFriendRequest(requestId, userId) {
    try {
      const request = await FriendRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Friend request not found');
      }
      
      if (request.receiver.toString() !== userId.toString()) {
        throw new Error('Not authorized to reject this request');
      }
      
      if (request.status !== 'pending') {
        throw new Error('Request is no longer pending');
      }
      
      // Update request status
      request.status = 'rejected';
      request.respondedAt = new Date();
      await request.save();
      
      return request;
    } catch (error) {
      console.error('Reject friend request error:', error);
      throw error;
    }
  }
  
  // Get friendship status between two users
  static async getFriendshipStatus(userId1, userId2) {
    try {
      const user1 = await User.findById(userId1);
      
      if (!user1) {
        return 'not_friends';
      }
      
      // Convert friends array to string IDs for comparison
      const user1FriendsIds = user1.friends.map(friendId => friendId.toString());
      if (user1FriendsIds.includes(userId2.toString())) {
        return 'friends';
      }
      
      // Check for pending requests
      const sentRequest = await FriendRequest.findOne({
        sender: userId1,
        receiver: userId2,
        status: 'pending'
      });
      
      if (sentRequest) {
        return 'request_sent';
      }
      
      const receivedRequest = await FriendRequest.findOne({
        sender: userId2,
        receiver: userId1,
        status: 'pending'
      });
      
      if (receivedRequest) {
        return 'request_received';
      }
      
      return 'not_friends';
    } catch (error) {
      console.error('Get friendship status error:', error);
      return 'not_friends';
    }
  }
}

module.exports = FriendRequestService;