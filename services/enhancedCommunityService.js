const mongoose = require('mongoose');

class EnhancedCommunityService {
  constructor() {
    this.activeWorkouts = new Map();
    this.mentorshipPrograms = new Map();
    this.tournaments = new Map();
    this.localEvents = new Map();
    this.datingMatches = new Map();
  }

  // Virtual Group Workouts
  async createVirtualWorkout(creatorId, workoutData) {
    try {
      const workoutId = 'workout_' + Date.now();
      const workout = {
        id: workoutId,
        creatorId,
        title: workoutData.title,
        description: workoutData.description,
        type: workoutData.type || 'general',
        difficulty: workoutData.difficulty || 'beginner',
        duration: workoutData.duration || 30,
        maxParticipants: workoutData.maxParticipants || 20,
        scheduledTime: new Date(workoutData.scheduledTime),
        isLive: false,
        participants: [],
        chatMessages: [],
        exercises: workoutData.exercises || [],
        createdAt: new Date()
      };

      this.activeWorkouts.set(workoutId, workout);

      return {
        success: true,
        workout,
        message: 'Virtual workout created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async joinVirtualWorkout(userId, workoutId) {
    try {
      const workout = this.activeWorkouts.get(workoutId);
      if (!workout) {
        throw new Error('Workout not found');
      }

      if (workout.participants.length >= workout.maxParticipants) {
        throw new Error('Workout is full');
      }

      if (workout.participants.some(p => p.userId === userId)) {
        throw new Error('Already joined this workout');
      }

      workout.participants.push({
        userId,
        joinedAt: new Date(),
        status: 'joined'
      });

      return {
        success: true,
        workout,
        message: 'Successfully joined virtual workout'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async startVirtualWorkout(workoutId, creatorId) {
    try {
      const workout = this.activeWorkouts.get(workoutId);
      if (!workout) {
        throw new Error('Workout not found');
      }

      if (workout.creatorId !== creatorId) {
        throw new Error('Only workout creator can start the session');
      }

      workout.isLive = true;
      workout.startedAt = new Date();

      return {
        success: true,
        workout,
        message: 'Virtual workout started'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fitness Mentorship Program
  async createMentorProfile(userId, mentorData) {
    try {
      const mentorId = 'mentor_' + Date.now();
      const mentor = {
        id: mentorId,
        userId,
        specialties: mentorData.specialties || [],
        experience: mentorData.experience || 'beginner',
        bio: mentorData.bio || '',
        availability: mentorData.availability || {},
        rating: 0,
        totalMentees: 0,
        isActive: true,
        certifications: mentorData.certifications || [],
        createdAt: new Date()
      };

      this.mentorshipPrograms.set(mentorId, mentor);

      return {
        success: true,
        mentor,
        message: 'Mentor profile created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async findMentors(filters = {}) {
    try {
      const { specialty, experience, rating } = filters;
      let mentors = Array.from(this.mentorshipPrograms.values());

      if (specialty) {
        mentors = mentors.filter(m => m.specialties.includes(specialty));
      }

      if (experience) {
        mentors = mentors.filter(m => m.experience === experience);
      }

      if (rating) {
        mentors = mentors.filter(m => m.rating >= rating);
      }

      return {
        success: true,
        mentors: mentors.slice(0, 20),
        count: mentors.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async requestMentorship(menteeId, mentorId, message) {
    try {
      const mentor = this.mentorshipPrograms.get(mentorId);
      if (!mentor) {
        throw new Error('Mentor not found');
      }

      const requestId = 'request_' + Date.now();
      const request = {
        id: requestId,
        menteeId,
        mentorId,
        message,
        status: 'pending',
        createdAt: new Date()
      };

      // In a real implementation, this would be stored in database
      // and mentor would be notified

      return {
        success: true,
        request,
        message: 'Mentorship request sent successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Challenge Tournaments
  async createTournament(creatorId, tournamentData) {
    try {
      const tournamentId = 'tournament_' + Date.now();
      const tournament = {
        id: tournamentId,
        creatorId,
        title: tournamentData.title,
        description: tournamentData.description,
        type: tournamentData.type || 'fitness',
        category: tournamentData.category || 'general',
        startDate: new Date(tournamentData.startDate),
        endDate: new Date(tournamentData.endDate),
        maxParticipants: tournamentData.maxParticipants || 100,
        entryFee: tournamentData.entryFee || 0,
        prizes: tournamentData.prizes || [],
        rules: tournamentData.rules || [],
        participants: [],
        leaderboard: [],
        status: 'upcoming',
        createdAt: new Date()
      };

      this.tournaments.set(tournamentId, tournament);

      return {
        success: true,
        tournament,
        message: 'Tournament created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async joinTournament(userId, tournamentId) {
    try {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      if (tournament.participants.length >= tournament.maxParticipants) {
        throw new Error('Tournament is full');
      }

      if (tournament.participants.some(p => p.userId === userId)) {
        throw new Error('Already joined this tournament');
      }

      tournament.participants.push({
        userId,
        joinedAt: new Date(),
        score: 0,
        rank: tournament.participants.length + 1
      });

      return {
        success: true,
        tournament,
        message: 'Successfully joined tournament'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Local Fitness Events
  async createLocalEvent(creatorId, eventData) {
    try {
      const eventId = 'event_' + Date.now();
      const event = {
        id: eventId,
        creatorId,
        title: eventData.title,
        description: eventData.description,
        type: eventData.type || 'meetup',
        location: {
          address: eventData.location?.address || '',
          city: eventData.location?.city || '',
          coordinates: eventData.location?.coordinates || null
        },
        dateTime: new Date(eventData.dateTime),
        maxAttendees: eventData.maxAttendees || 50,
        cost: eventData.cost || 0,
        requirements: eventData.requirements || [],
        attendees: [],
        status: 'upcoming',
        createdAt: new Date()
      };

      this.localEvents.set(eventId, event);

      return {
        success: true,
        event,
        message: 'Local event created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async findLocalEvents(location, radius = 25) {
    try {
      // In a real implementation, this would use geospatial queries
      const events = Array.from(this.localEvents.values())
        .filter(event => event.status === 'upcoming')
        .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

      return {
        success: true,
        events: events.slice(0, 20),
        location,
        radius
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fitness Dating
  async createDatingProfile(userId, profileData) {
    try {
      const profile = {
        userId,
        bio: profileData.bio || '',
        fitnessInterests: profileData.fitnessInterests || [],
        workoutPreferences: profileData.workoutPreferences || [],
        fitnessLevel: profileData.fitnessLevel || 'beginner',
        goals: profileData.goals || [],
        location: profileData.location || '',
        age: profileData.age,
        photos: profileData.photos || [],
        isActive: true,
        preferences: {
          ageRange: profileData.preferences?.ageRange || [18, 65],
          fitnessLevel: profileData.preferences?.fitnessLevel || 'any',
          maxDistance: profileData.preferences?.maxDistance || 50
        },
        createdAt: new Date()
      };

      this.datingMatches.set(userId, profile);

      return {
        success: true,
        profile,
        message: 'Dating profile created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async findFitnessMatches(userId, filters = {}) {
    try {
      const userProfile = this.datingMatches.get(userId);
      if (!userProfile) {
        throw new Error('Please create a dating profile first');
      }

      let matches = Array.from(this.datingMatches.values())
        .filter(profile => profile.userId !== userId && profile.isActive);

      // Apply compatibility scoring
      matches = matches.map(match => ({
        ...match,
        compatibilityScore: this.calculateCompatibility(userProfile, match)
      })).sort((a, b) => b.compatibilityScore - a.compatibilityScore);

      return {
        success: true,
        matches: matches.slice(0, 10),
        count: matches.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper Methods
  calculateCompatibility(profile1, profile2) {
    let score = 0;

    // Fitness interests overlap
    const commonInterests = profile1.fitnessInterests.filter(interest => 
      profile2.fitnessInterests.includes(interest)
    );
    score += commonInterests.length * 20;

    // Fitness level compatibility
    const levelCompatibility = {
      'beginner': ['beginner', 'intermediate'],
      'intermediate': ['beginner', 'intermediate', 'advanced'],
      'advanced': ['intermediate', 'advanced']
    };

    if (levelCompatibility[profile1.fitnessLevel]?.includes(profile2.fitnessLevel)) {
      score += 30;
    }

    // Goals alignment
    const commonGoals = profile1.goals.filter(goal => profile2.goals.includes(goal));
    score += commonGoals.length * 15;

    // Age compatibility (within preferences)
    if (profile2.age >= profile1.preferences.ageRange[0] && 
        profile2.age <= profile1.preferences.ageRange[1]) {
      score += 25;
    }

    return Math.min(score, 100);
  }

  // Get active virtual workouts
  getActiveWorkouts(filters = {}) {
    try {
      let workouts = Array.from(this.activeWorkouts.values());

      if (filters.type) {
        workouts = workouts.filter(w => w.type === filters.type);
      }

      if (filters.difficulty) {
        workouts = workouts.filter(w => w.difficulty === filters.difficulty);
      }

      if (filters.isLive !== undefined) {
        workouts = workouts.filter(w => w.isLive === filters.isLive);
      }

      return {
        success: true,
        workouts: workouts.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime)),
        count: workouts.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get active tournaments
  getActiveTournaments(filters = {}) {
    try {
      let tournaments = Array.from(this.tournaments.values())
        .filter(t => t.status === 'upcoming' || t.status === 'active');

      if (filters.type) {
        tournaments = tournaments.filter(t => t.type === filters.type);
      }

      if (filters.category) {
        tournaments = tournaments.filter(t => t.category === filters.category);
      }

      return {
        success: true,
        tournaments: tournaments.sort((a, b) => new Date(a.startDate) - new Date(b.startDate)),
        count: tournaments.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update tournament leaderboard
  updateTournamentScore(tournamentId, userId, score) {
    try {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      const participant = tournament.participants.find(p => p.userId === userId);
      if (!participant) {
        throw new Error('User not participating in this tournament');
      }

      participant.score = score;

      // Update leaderboard
      tournament.leaderboard = tournament.participants
        .sort((a, b) => b.score - a.score)
        .map((p, index) => ({
          ...p,
          rank: index + 1
        }));

      return {
        success: true,
        leaderboard: tournament.leaderboard,
        message: 'Score updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send workout chat message
  sendWorkoutMessage(workoutId, userId, message) {
    try {
      const workout = this.activeWorkouts.get(workoutId);
      if (!workout) {
        throw new Error('Workout not found');
      }

      const chatMessage = {
        id: Date.now(),
        userId,
        message,
        timestamp: new Date()
      };

      workout.chatMessages.push(chatMessage);

      return {
        success: true,
        message: chatMessage
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get workout chat messages
  getWorkoutMessages(workoutId, limit = 50) {
    try {
      const workout = this.activeWorkouts.get(workoutId);
      if (!workout) {
        throw new Error('Workout not found');
      }

      return {
        success: true,
        messages: workout.chatMessages.slice(-limit)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new EnhancedCommunityService();