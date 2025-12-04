const Group = require('../models/Group');
const Post = require('../models/Post');
const User = require('../models/User');

class CommunityService {
  // Group Management
  async createGroup(userId, groupData) {
    try {
      const group = new Group({
        ...groupData,
        creator: userId,
        admins: [userId],
        members: [{
          user: userId,
          role: 'member',
          joinedAt: new Date()
        }]
      });

      await group.save();
      await group.populate('creator', 'fullName email');
      return group;
    } catch (error) {
      throw new Error('Failed to create group: ' + error.message);
    }
  }

  async getUserGroups(userId) {
    try {
      const groups = await Group.find({
        'members.user': userId
      })
      .populate('creator', 'fullName email')
      .populate('members.user', 'fullName email')
      .sort({ updatedAt: -1 });

      return groups;
    } catch (error) {
      throw new Error('Failed to get user groups: ' + error.message);
    }
  }

  async getPublicGroups(limit = 20, category = null) {
    try {
      const query = { privacy: 'public' };
      if (category) query.category = category;

      const groups = await Group.find(query)
        .populate('creator', 'fullName email')
        .sort({ 'stats.totalMembers': -1, updatedAt: -1 })
        .limit(limit);

      return groups;
    } catch (error) {
      throw new Error('Failed to get public groups: ' + error.message);
    }
  }

  async joinGroup(userId, groupId) {
    try {
      console.log('CommunityService: joinGroup called with userId:', userId, 'groupId:', groupId);
      
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if user is already a member
      const isAlreadyMember = group.members.some(member => 
        member.user && member.user.toString() === userId.toString()
      );
      
      if (isAlreadyMember) {
        console.log('User is already a member of this group');
        return group;
      }

      if (group.privacy === 'private') {
        throw new Error('This group is private and requires an invitation to join');
      }

      // Add user to group members with proper structure
      const updatedGroup = await Group.findByIdAndUpdate(groupId, { 
        $addToSet: { 
          members: {
            user: userId,
            role: 'member',
            joinedAt: new Date()
          }
        },
        $inc: { 'stats.totalMembers': 1 }
      }, { new: true }).populate('creator', 'fullName email');

      console.log('User successfully joined group:', updatedGroup.name);
      return updatedGroup;
    } catch (error) {
      console.error('Error in joinGroup:', error);
      throw new Error('Failed to join group: ' + error.message);
    }
  }

  async leaveGroup(userId, groupId) {
    try {
      console.log('CommunityService: leaveGroup called with userId:', userId, 'groupId:', groupId);
      
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if user is a member
      const isMember = group.members.some(member => 
        member.user && member.user.toString() === userId.toString()
      );
      
      if (!isMember) {
        throw new Error('You are not a member of this group');
      }

      // Remove user from group members
      const updatedGroup = await Group.findByIdAndUpdate(groupId, { 
        $pull: { 
          members: { user: userId }
        },
        $inc: { 'stats.totalMembers': -1 }
      }, { new: true });

      console.log('User successfully left group:', updatedGroup.name);
      return updatedGroup;
    } catch (error) {
      console.error('Error in leaveGroup:', error);
      throw new Error('Failed to leave group: ' + error.message);
    }
  }
  
  async getGroupMembers(groupId) {
    try {
      const group = await Group.findById(groupId)
        .populate('members.user', 'fullName email personalInfo')
        .populate('creator', 'fullName email');
        
      if (!group) {
        throw new Error('Group not found');
      }
      
      return group.members
        .filter(member => member.user && member.user._id) // Filter out invalid members
        .map(member => ({
          _id: member.user._id,
          fullName: member.user.fullName || 'Unknown User',
          email: member.user.email || '',
          role: member.role || 'member',
          joinedAt: member.joinedAt,
          firstName: member.user.personalInfo?.firstName || member.user.fullName?.split(' ')[0] || 'User'
        }));
    } catch (error) {
      throw new Error('Failed to get group members: ' + error.message);
    }
  }
  
  async deleteGroup(userId, groupId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }
      
      // Check if user is the creator
      if (group.creator.toString() !== userId.toString()) {
        throw new Error('Only the group creator can delete this group');
      }
      
      // Delete all posts in the group
      await Post.deleteMany({ group: groupId });
      
      // Delete the group
      await Group.findByIdAndDelete(groupId);
      
      return { success: true, message: 'Group deleted successfully' };
    } catch (error) {
      throw new Error('Failed to delete group: ' + error.message);
    }
  }
  
  async searchContent(query) {
    try {
      const groups = await this.searchGroups(query, 5);
      const posts = await this.searchPosts(query, null, 10);
      
      return {
        groups: groups,
        posts: posts
      };
    } catch (error) {
      throw new Error('Failed to search content: ' + error.message);
    }
  }

  // Post Management
  async createPost(userId, postData) {
    try {
      const post = new Post({
        ...postData,
        author: userId
      });

      await post.save();
      await post.populate('author', 'fullName email personalInfo');
      await post.populate('group', 'name');

      // Update group stats
      await Group.findByIdAndUpdate(postData.group, {
        $inc: { 'stats.totalPosts': 1 }
      });

      return post;
    } catch (error) {
      throw new Error('Failed to create post: ' + error.message);
    }
  }

  async getGroupPosts(groupId, limit = 20, skip = 0) {
    try {
      const posts = await Post.find({ group: groupId, isApproved: true })
        .populate('author', 'fullName email personalInfo')
        .populate('group', 'name')
        .populate('comments.user', 'fullName email')
        .sort({ isPinned: -1, createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return posts;
    } catch (error) {
      throw new Error('Failed to get group posts: ' + error.message);
    }
  }

  async getUserFeed(userId, limit = 20, skip = 0) {
    try {
      console.log('CommunityService: getUserFeed called for userId:', userId, 'limit:', limit, 'skip:', skip);
      
      // Get user's groups
      const userGroups = await Group.find({
        'members.user': userId
      }).select('_id');

      console.log('User is member of', userGroups.length, 'groups');
      
      if (userGroups.length === 0) {
        console.log('User has no groups, returning empty feed');
        return [];
      }

      const groupIds = userGroups.map(group => group._id);
      console.log('Searching for posts in groups:', groupIds);

      const posts = await Post.find({ 
        group: { $in: groupIds },
        isApproved: true 
      })
      .populate('author', 'fullName email personalInfo')
      .populate('group', 'name')
      .populate('comments.user', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

      console.log('Found', posts.length, 'posts for user feed');
      return posts || [];
    } catch (error) {
      console.error('Error in getUserFeed:', error);
      throw new Error('Failed to get user feed: ' + error.message);
    }
  }

  async likePost(userId, postId) {
    try {
      const post = await Post.findById(postId);
      if (!post) throw new Error('Post not found');

      const existingLike = post.likes.find(like => 
        like.user.toString() === userId.toString()
      );

      let isLiked = false;
      if (existingLike) {
        // Unlike
        post.likes = post.likes.filter(like => 
          like.user.toString() !== userId.toString()
        );
        isLiked = false;
      } else {
        // Like
        post.likes.push({ user: userId });
        isLiked = true;
      }

      // Update stats
      post.stats.totalLikes = post.likes.length;
      await post.save();
      
      return {
        likes: post.stats.totalLikes,
        isLiked: isLiked
      };
    } catch (error) {
      throw new Error('Failed to like/unlike post: ' + error.message);
    }
  }

  async addComment(userId, postId, content) {
    try {
      const post = await Post.findById(postId);
      if (!post) throw new Error('Post not found');

      post.comments.push({
        user: userId,
        content: content.trim(),
        createdAt: new Date()
      });

      await post.save();
      await post.populate('comments.user', 'fullName email');
      
      return post.comments[post.comments.length - 1];
    } catch (error) {
      throw new Error('Failed to add comment: ' + error.message);
    }
  }

  async searchGroups(query, limit = 10) {
    try {
      const groups = await Group.find({
        $and: [
          { privacy: 'public' },
          {
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } },
              { tags: { $in: [new RegExp(query, 'i')] } }
            ]
          }
        ]
      })
      .populate('creator', 'fullName email')
      .limit(limit);

      return groups;
    } catch (error) {
      throw new Error('Failed to search groups: ' + error.message);
    }
  }

  async searchPosts(query, groupId = null, limit = 20) {
    try {
      const searchQuery = {
        isApproved: true,
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { content: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      };

      if (groupId) {
        searchQuery.group = groupId;
      }

      const posts = await Post.find(searchQuery)
        .populate('author', 'fullName email personalInfo')
        .populate('group', 'name')
        .sort({ createdAt: -1 })
        .limit(limit);

      return posts;
    } catch (error) {
      throw new Error('Failed to search posts: ' + error.message);
    }
  }

  // Analytics and Stats
  async getGroupStats(groupId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) throw new Error('Group not found');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayPosts = await Post.countDocuments({
        group: groupId,
        createdAt: { $gte: today }
      });

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyPosts = await Post.countDocuments({
        group: groupId,
        createdAt: { $gte: weekAgo }
      });

      const topContributors = await Post.aggregate([
        { $match: { group: group._id } },
        { $group: { _id: '$author', postCount: { $sum: 1 } } },
        { $sort: { postCount: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { postCount: 1, 'user.fullName': 1, 'user.email': 1 } }
      ]);

      return {
        totalMembers: group.stats.totalMembers,
        totalPosts: group.stats.totalPosts,
        postsToday: todayPosts,
        postsThisWeek: weeklyPosts,
        topContributors
      };
    } catch (error) {
      throw new Error('Failed to get group stats: ' + error.message);
    }
  }

  // Create sample data for testing
  async createSampleData() {
    try {
      console.log('Creating sample community data...');
      
      // Create sample groups
      const sampleGroups = [
        {
          name: 'Fitness Beginners',
          description: 'A supportive community for those just starting their fitness journey',
          category: 'fitness',
          privacy: 'public',
          tags: ['beginners', 'support', 'motivation']
        },
        {
          name: 'Nutrition Enthusiasts',
          description: 'Share recipes, meal plans, and nutrition tips',
          category: 'nutrition',
          privacy: 'public',
          tags: ['nutrition', 'recipes', 'healthy-eating']
        },
        {
          name: 'Weight Loss Warriors',
          description: 'Support group for weight loss goals and achievements',
          category: 'weight-loss',
          privacy: 'public',
          tags: ['weight-loss', 'motivation', 'progress']
        }
      ];
      
      const createdGroups = [];
      for (const groupData of sampleGroups) {
        const existingGroup = await Group.findOne({ name: groupData.name });
        if (!existingGroup) {
          const group = new Group({
            ...groupData,
            creator: null, // Will be set when a user creates it
            members: [],
            stats: { totalPosts: 0, totalMembers: 0 }
          });
          await group.save();
          createdGroups.push(group);
          console.log('Created sample group:', group.name);
        }
      }
      
      return { success: true, groupsCreated: createdGroups.length };
    } catch (error) {
      console.error('Error creating sample data:', error);
      throw new Error('Failed to create sample data: ' + error.message);
    }
  }
  
  // Moderation
  async reportPost(userId, postId, reason) {
    try {
      // In a real app, you'd have a reports collection
      // For now, we'll just log it
      console.log(`Post ${postId} reported by user ${userId} for: ${reason}`);
      return { success: true, message: 'Post reported successfully' };
    } catch (error) {
      throw new Error('Failed to report post: ' + error.message);
    }
  }

  async deletePost(userId, postId) {
    try {
      const post = await Post.findById(postId);
      if (!post) throw new Error('Post not found');

      // Check if user is author or group admin
      const group = await Group.findById(post.group);
      const isAuthor = post.author.toString() === userId.toString();
      const isAdmin = group.admins.includes(userId) || group.creator.toString() === userId.toString();

      if (!isAuthor && !isAdmin) {
        throw new Error('Not authorized to delete this post');
      }

      await Post.findByIdAndDelete(postId);
      
      // Update group stats
      await Group.findByIdAndUpdate(post.group, {
        $inc: { 'stats.totalPosts': -1 }
      });

      return { success: true, message: 'Post deleted successfully' };
    } catch (error) {
      throw new Error('Failed to delete post: ' + error.message);
    }
  }
}

module.exports = new CommunityService();