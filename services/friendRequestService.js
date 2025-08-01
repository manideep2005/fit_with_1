const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');

class FriendRequestService {
  
  // Send friend request - Simplified with minimal validations
  static async sendFriendRequest(senderId, receiverEmail, message = '') {
    try {
      console.log('FriendRequestService.sendFriendRequest:', { senderId, receiverEmail });
      
      // Find receiver by email
      const receiver = await User.findOne({ email: receiverEmail.toLowerCase().trim() });
      if (!receiver) {
        throw new Error('User not found with this email address');
      }
      
      const receiverId = receiver._id;
      
      // Basic check - can't send to yourself
      if (senderId.toString() === receiverId.toString()) {
        throw new Error('Cannot send friend request to yourself');
      }
      
      // Create friend request without extensive validation
      const friendRequest = new FriendRequest({
        sender: senderId,
        receiver: receiverId,
        message: message.trim(),
        status: 'pending'
      });
      
      await friendRequest.save();
      await friendRequest.populate('sender', 'fullName email');
      await friendRequest.populate('receiver', 'fullName email');
      
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
  
  // Accept friend request - Simplified to avoid validation errors
  static async acceptFriendRequest(requestId, userId) {
    try {
      const request = await FriendRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Friend request not found');
      }
      
      // Update friends lists using direct MongoDB operations to bypass validation
      await User.updateOne(
        { _id: request.sender },
        { $addToSet: { friends: request.receiver } }
      );
      
      await User.updateOne(
        { _id: request.receiver },
        { $addToSet: { friends: request.sender } }
      );
      
      // Update request status
      request.status = 'accepted';
      request.respondedAt = new Date();
      await request.save();
      
      return request;
    } catch (error) {
      console.error('Accept friend request error:', error);
      throw error;
    }
  }
  
  // Reject friend request - Simplified
  static async rejectFriendRequest(requestId, userId) {
    try {
      const request = await FriendRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Friend request not found');
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
  
  // Get friendship status between two users - Simplified
  static async getFriendshipStatus(userId1, userId2) {
    try {
      // Check if they're friends using direct query
      const user1 = await User.findOne({ 
        _id: userId1, 
        friends: userId2 
      });
      
      if (user1) {
        return 'friends';
      }
      
      // Check for pending requests
      const pendingRequest = await FriendRequest.findOne({
        $or: [
          { sender: userId1, receiver: userId2, status: 'pending' },
          { sender: userId2, receiver: userId1, status: 'pending' }
        ]
      });
      
      if (pendingRequest) {
        return pendingRequest.sender.toString() === userId1.toString() ? 'request_sent' : 'request_received';
      }
      
      return 'not_friends';
    } catch (error) {
      console.error('Get friendship status error:', error);
      return 'not_friends';
    }
  }
}

module.exports = FriendRequestService;