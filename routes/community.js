const express = require('express');
const router = express.Router();
const communityService = require('../services/communityService');

// Middleware to ensure user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  next();
};

// Get user's groups
router.get('/groups/my', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    console.log('Getting groups for user:', userId);
    
    const groups = await communityService.getUserGroups(userId);
    console.log('Found groups:', groups.length);
    
    res.json({
      success: true,
      groups: groups || []
    });
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get groups'
    });
  }
});

// Get public groups
router.get('/groups/public', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { limit = 20, category } = req.query;
    
    console.log('Getting public groups for user:', userId, 'category:', category);
    
    const groups = await communityService.getPublicGroups(parseInt(limit), category);
    const userGroups = await communityService.getUserGroups(userId);
    const userGroupIds = userGroups.map(g => g._id.toString());
    
    // Mark which groups user has already joined
    const groupsWithMembership = groups.map(group => ({
      ...group.toObject(),
      isMember: userGroupIds.includes(group._id.toString())
    }));
    
    console.log('Found public groups:', groups.length, 'User is member of:', userGroupIds.length);
    
    res.json({
      success: true,
      groups: groupsWithMembership
    });
  } catch (error) {
    console.error('Get public groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get public groups'
    });
  }
});

// Create group
router.post('/groups', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    
    console.log('Creating group for user:', userId, 'data:', req.body);
    
    const group = await communityService.createGroup(userId, req.body);
    console.log('Group created:', group._id);
    
    res.json({
      success: true,
      message: 'Group created successfully',
      group: group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create group'
    });
  }
});

// Join group
router.post('/groups/:groupId/join', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { groupId } = req.params;
    
    console.log('User', userId, 'attempting to join group', groupId);
    
    const result = await communityService.joinGroup(userId, groupId);
    console.log('Join group result:', result);
    
    res.json({
      success: true,
      message: 'Joined group successfully',
      group: result
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to join group'
    });
  }
});

// Leave group
router.post('/groups/:groupId/leave', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { groupId } = req.params;
    
    console.log('User', userId, 'attempting to leave group', groupId);
    
    const result = await communityService.leaveGroup(userId, groupId);
    console.log('Leave group result:', result);
    
    res.json({
      success: true,
      message: 'Left group successfully'
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to leave group'
    });
  }
});

// Get user feed
router.get('/feed', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { limit = 20, skip = 0 } = req.query;
    
    console.log('Getting feed for user:', userId, 'limit:', limit, 'skip:', skip);
    
    const posts = await communityService.getUserFeed(userId, parseInt(limit), parseInt(skip));
    console.log('Found posts:', posts.length);
    
    res.json({
      success: true,
      posts: posts || []
    });
  } catch (error) {
    console.error('Get user feed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user feed'
    });
  }
});

// Create post
router.post('/posts', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    
    console.log('Creating post for user:', userId, 'data:', req.body);
    
    const post = await communityService.createPost(userId, req.body);
    console.log('Post created:', post._id);
    
    res.json({
      success: true,
      message: 'Post created successfully',
      post: post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create post'
    });
  }
});

// Like/unlike post
router.post('/posts/:postId/like', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { postId } = req.params;
    
    console.log('User', userId, 'liking post', postId);
    
    const result = await communityService.likePost(userId, postId);
    
    res.json({
      success: true,
      likes: result.likes || 0,
      isLiked: result.isLiked || false
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to like post'
    });
  }
});

// Get group members
router.get('/groups/:groupId/members', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.params;
    const members = await communityService.getGroupMembers(groupId);
    
    res.json({
      success: true,
      members: members || []
    });
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group members'
    });
  }
});

// Search community content
router.get('/search', isAuthenticated, async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }
    
    const results = await communityService.searchContent(query.trim());
    
    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    console.error('Search community error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search community content'
    });
  }
});

module.exports = router;