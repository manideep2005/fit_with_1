/**
 * Buddy Finder Service
 * AI-powered workout partner matching and location-based fitness connections
 */

class BuddyFinderService {
    constructor() {
        this.userProfiles = new Map();
        this.activeSearches = new Map();
        this.matches = new Map();
        this.meetupRequests = new Map();
        this.safetyFeatures = this.initializeSafetyFeatures();
        this.matchingAlgorithm = this.initializeMatchingAlgorithm();
    }

    initializeSafetyFeatures() {
        return {
            verificationRequired: true,
            publicMeetingPlaces: true,
            reportingSystem: true,
            blockingSystem: true,
            emergencyContacts: true,
            meetupTracking: true
        };
    }

    initializeMatchingAlgorithm() {
        return {
            fitnessLevelWeight: 0.25,
            locationWeight: 0.30,
            scheduleWeight: 0.20,
            goalsWeight: 0.15,
            personalityWeight: 0.10
        };
    }

    async createBuddyProfile(userId, profileData) {
        try {
            const profile = {
                userId: userId,
                personalInfo: {
                    displayName: profileData.displayName,
                    age: profileData.age,
                    gender: profileData.gender,
                    bio: profileData.bio || '',
                    profilePhoto: profileData.profilePhoto || null,
                    verified: false
                },
                fitnessInfo: {
                    level: profileData.fitnessLevel || 'beginner', // beginner, intermediate, advanced
                    goals: profileData.goals || [], // weight_loss, muscle_gain, endurance, etc.
                    preferredActivities: profileData.activities || [], // gym, running, yoga, etc.
                    workoutFrequency: profileData.workoutFrequency || 3, // times per week
                    preferredTimes: profileData.preferredTimes || [], // morning, afternoon, evening
                    intensity: profileData.intensity || 'moderate' // low, moderate, high
                },
                location: {
                    city: profileData.city,
                    state: profileData.state,
                    country: profileData.country,
                    coordinates: profileData.coordinates || null,
                    searchRadius: profileData.searchRadius || 10, // km
                    willingToTravel: profileData.willingToTravel || 5 // km
                },
                preferences: {
                    ageRange: profileData.ageRange || { min: 18, max: 65 },
                    genderPreference: profileData.genderPreference || 'any', // male, female, any
                    groupSize: profileData.groupSize || 'individual', // individual, small_group, large_group
                    meetingType: profileData.meetingType || 'both', // virtual, in_person, both
                    communicationStyle: profileData.communicationStyle || 'friendly' // competitive, supportive, friendly
                },
                availability: {
                    weekdays: profileData.weekdays || [],
                    weekends: profileData.weekends || [],
                    timeSlots: profileData.timeSlots || []
                },
                safety: {
                    emergencyContact: profileData.emergencyContact || null,
                    publicMeetingsOnly: profileData.publicMeetingsOnly !== false,
                    shareLocation: profileData.shareLocation !== false,
                    backgroundCheck: profileData.backgroundCheck || false
                },
                stats: {
                    totalMeetups: 0,
                    successfulMeetups: 0,
                    rating: 5.0,
                    reviews: [],
                    badges: []
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
                isActive: true
            };

            this.userProfiles.set(userId, profile);

            return {
                success: true,
                profile: this.sanitizeProfileForClient(profile),
                message: 'Buddy profile created successfully'
            };

        } catch (error) {
            console.error('Create buddy profile error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async findBuddies(userId, searchCriteria = {}) {
        try {
            const userProfile = this.userProfiles.get(userId);
            if (!userProfile) {
                throw new Error('User profile not found. Please create a buddy profile first.');
            }

            const searchId = this.generateSearchId();
            const search = {
                id: searchId,
                userId: userId,
                criteria: {
                    ...userProfile.preferences,
                    ...searchCriteria
                },
                startedAt: Date.now(),
                status: 'active'
            };

            this.activeSearches.set(searchId, search);

            // Find potential matches
            const potentialMatches = await this.findPotentialMatches(userProfile, search.criteria);
            
            // Score and rank matches
            const rankedMatches = this.rankMatches(userProfile, potentialMatches);

            // Store matches for this search
            this.matches.set(searchId, rankedMatches);

            return {
                success: true,
                searchId: searchId,
                matches: rankedMatches.slice(0, 20), // Return top 20 matches
                totalMatches: rankedMatches.length,
                searchCriteria: search.criteria
            };

        } catch (error) {
            console.error('Find buddies error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async findPotentialMatches(userProfile, criteria) {
        const potentialMatches = [];

        for (const [candidateId, candidateProfile] of this.userProfiles) {
            // Skip self
            if (candidateId === userProfile.userId) continue;
            
            // Skip inactive profiles
            if (!candidateProfile.isActive) continue;

            // Apply basic filters
            if (!this.passesBasicFilters(userProfile, candidateProfile, criteria)) {
                continue;
            }

            // Calculate compatibility score
            const compatibilityScore = this.calculateCompatibilityScore(userProfile, candidateProfile);

            if (compatibilityScore > 0.3) { // Minimum compatibility threshold
                potentialMatches.push({
                    profile: candidateProfile,
                    compatibilityScore: compatibilityScore,
                    matchReasons: this.getMatchReasons(userProfile, candidateProfile),
                    distance: this.calculateDistance(userProfile.location, candidateProfile.location)
                });
            }
        }

        return potentialMatches;
    }

    passesBasicFilters(userProfile, candidateProfile, criteria) {
        // Age filter
        const candidateAge = candidateProfile.personalInfo.age;
        if (candidateAge < criteria.ageRange.min || candidateAge > criteria.ageRange.max) {
            return false;
        }

        // Gender preference filter
        if (criteria.genderPreference !== 'any' && 
            candidateProfile.personalInfo.gender !== criteria.genderPreference) {
            return false;
        }

        // Location filter
        const distance = this.calculateDistance(userProfile.location, candidateProfile.location);
        if (distance > userProfile.location.searchRadius) {
            return false;
        }

        // Fitness level compatibility (within 1 level)
        const levelDiff = Math.abs(
            this.getFitnessLevelNumber(userProfile.fitnessInfo.level) - 
            this.getFitnessLevelNumber(candidateProfile.fitnessInfo.level)
        );
        if (levelDiff > 1) {
            return false;
        }

        return true;
    }

    calculateCompatibilityScore(userProfile, candidateProfile) {
        let score = 0;
        const weights = this.matchingAlgorithm;

        // Fitness level compatibility
        const levelDiff = Math.abs(
            this.getFitnessLevelNumber(userProfile.fitnessInfo.level) - 
            this.getFitnessLevelNumber(candidateProfile.fitnessInfo.level)
        );
        const levelScore = Math.max(0, 1 - (levelDiff * 0.3));
        score += levelScore * weights.fitnessLevelWeight;

        // Location proximity
        const distance = this.calculateDistance(userProfile.location, candidateProfile.location);
        const maxDistance = userProfile.location.searchRadius;
        const locationScore = Math.max(0, 1 - (distance / maxDistance));
        score += locationScore * weights.locationWeight;

        // Schedule compatibility
        const scheduleScore = this.calculateScheduleCompatibility(
            userProfile.availability, 
            candidateProfile.availability
        );
        score += scheduleScore * weights.scheduleWeight;

        // Goals alignment
        const goalsScore = this.calculateGoalsAlignment(
            userProfile.fitnessInfo.goals,
            candidateProfile.fitnessInfo.goals
        );
        score += goalsScore * weights.goalsWeight;

        // Activity preferences
        const activityScore = this.calculateActivityAlignment(
            userProfile.fitnessInfo.preferredActivities,
            candidateProfile.fitnessInfo.preferredActivities
        );
        score += activityScore * weights.personalityWeight;

        return Math.min(score, 1.0);
    }

    calculateScheduleCompatibility(schedule1, schedule2) {
        let commonSlots = 0;
        let totalSlots = 0;

        // Check weekday availability
        const weekdays1 = new Set(schedule1.weekdays || []);
        const weekdays2 = new Set(schedule2.weekdays || []);
        const commonWeekdays = [...weekdays1].filter(day => weekdays2.has(day));
        
        // Check weekend availability
        const weekends1 = new Set(schedule1.weekends || []);
        const weekends2 = new Set(schedule2.weekends || []);
        const commonWeekends = [...weekends1].filter(day => weekends2.has(day));

        // Check time slots
        const timeSlots1 = new Set(schedule1.timeSlots || []);
        const timeSlots2 = new Set(schedule2.timeSlots || []);
        const commonTimeSlots = [...timeSlots1].filter(slot => timeSlots2.has(slot));

        commonSlots = commonWeekdays.length + commonWeekends.length + commonTimeSlots.length;
        totalSlots = Math.max(
            weekdays1.size + weekends1.size + timeSlots1.size,
            weekdays2.size + weekends2.size + timeSlots2.size
        );

        return totalSlots > 0 ? commonSlots / totalSlots : 0;
    }

    calculateGoalsAlignment(goals1, goals2) {
        if (!goals1.length || !goals2.length) return 0;

        const set1 = new Set(goals1);
        const set2 = new Set(goals2);
        const intersection = [...set1].filter(goal => set2.has(goal));
        const union = [...new Set([...goals1, ...goals2])];

        return intersection.length / union.length;
    }

    calculateActivityAlignment(activities1, activities2) {
        if (!activities1.length || !activities2.length) return 0;

        const set1 = new Set(activities1);
        const set2 = new Set(activities2);
        const intersection = [...set1].filter(activity => set2.has(activity));
        const union = [...new Set([...activities1, ...activities2])];

        return intersection.length / union.length;
    }

    rankMatches(userProfile, matches) {
        return matches
            .sort((a, b) => {
                // Primary sort by compatibility score
                if (b.compatibilityScore !== a.compatibilityScore) {
                    return b.compatibilityScore - a.compatibilityScore;
                }
                
                // Secondary sort by distance (closer is better)
                return a.distance - b.distance;
            })
            .map((match, index) => ({
                ...match,
                rank: index + 1,
                profile: this.sanitizeProfileForClient(match.profile)
            }));
    }

    getMatchReasons(userProfile, candidateProfile) {
        const reasons = [];

        // Check fitness level compatibility
        if (userProfile.fitnessInfo.level === candidateProfile.fitnessInfo.level) {
            reasons.push(`Same fitness level (${userProfile.fitnessInfo.level})`);
        }

        // Check common goals
        const commonGoals = userProfile.fitnessInfo.goals.filter(goal => 
            candidateProfile.fitnessInfo.goals.includes(goal)
        );
        if (commonGoals.length > 0) {
            reasons.push(`Shared goals: ${commonGoals.join(', ')}`);
        }

        // Check common activities
        const commonActivities = userProfile.fitnessInfo.preferredActivities.filter(activity => 
            candidateProfile.fitnessInfo.preferredActivities.includes(activity)
        );
        if (commonActivities.length > 0) {
            reasons.push(`Common interests: ${commonActivities.join(', ')}`);
        }

        // Check proximity
        const distance = this.calculateDistance(userProfile.location, candidateProfile.location);
        if (distance < 2) {
            reasons.push('Very close location');
        } else if (distance < 5) {
            reasons.push('Nearby location');
        }

        // Check schedule compatibility
        const scheduleScore = this.calculateScheduleCompatibility(
            userProfile.availability, 
            candidateProfile.availability
        );
        if (scheduleScore > 0.7) {
            reasons.push('Compatible schedules');
        }

        return reasons;
    }

    async sendMeetupRequest(fromUserId, toUserId, requestData) {
        try {
            const fromProfile = this.userProfiles.get(fromUserId);
            const toProfile = this.userProfiles.get(toUserId);

            if (!fromProfile || !toProfile) {
                throw new Error('One or both user profiles not found');
            }

            const requestId = this.generateRequestId();
            const meetupRequest = {
                id: requestId,
                fromUserId: fromUserId,
                toUserId: toUserId,
                type: requestData.type || 'workout_buddy', // workout_buddy, group_session, challenge
                activity: requestData.activity,
                proposedDate: requestData.proposedDate,
                proposedTime: requestData.proposedTime,
                location: requestData.location,
                duration: requestData.duration || 60, // minutes
                message: requestData.message || '',
                isPublicPlace: requestData.isPublicPlace !== false,
                maxParticipants: requestData.maxParticipants || 2,
                status: 'pending',
                createdAt: Date.now(),
                expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
            };

            this.meetupRequests.set(requestId, meetupRequest);

            // Send notification to recipient
            await this.notifyMeetupRequest(toUserId, meetupRequest);

            return {
                success: true,
                requestId: requestId,
                message: 'Meetup request sent successfully'
            };

        } catch (error) {
            console.error('Send meetup request error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async respondToMeetupRequest(requestId, userId, response, responseData = {}) {
        try {
            const request = this.meetupRequests.get(requestId);
            if (!request) {
                throw new Error('Meetup request not found');
            }

            if (request.toUserId !== userId) {
                throw new Error('Not authorized to respond to this request');
            }

            if (request.status !== 'pending') {
                throw new Error('Request has already been responded to');
            }

            if (Date.now() > request.expiresAt) {
                throw new Error('Request has expired');
            }

            request.status = response; // accepted, declined
            request.respondedAt = Date.now();
            request.responseMessage = responseData.message || '';

            if (response === 'accepted') {
                // Create meetup event
                const meetup = await this.createMeetupEvent(request, responseData);
                request.meetupId = meetup.id;

                // Notify both users
                await this.notifyMeetupAccepted(request.fromUserId, request, meetup);
                await this.notifyMeetupAccepted(request.toUserId, request, meetup);

                return {
                    success: true,
                    message: 'Meetup request accepted',
                    meetup: meetup
                };
            } else {
                // Notify requester of decline
                await this.notifyMeetupDeclined(request.fromUserId, request);

                return {
                    success: true,
                    message: 'Meetup request declined'
                };
            }

        } catch (error) {
            console.error('Respond to meetup request error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async createMeetupEvent(request, responseData) {
        const meetupId = this.generateMeetupId();
        
        const meetup = {
            id: meetupId,
            requestId: request.id,
            participants: [request.fromUserId, request.toUserId],
            activity: request.activity,
            date: request.proposedDate,
            time: request.proposedTime,
            location: {
                ...request.location,
                isPublic: request.isPublicPlace,
                safetyVerified: true
            },
            duration: request.duration,
            status: 'scheduled',
            safetyFeatures: {
                emergencyContacts: true,
                locationSharing: true,
                checkInRequired: true,
                publicPlace: request.isPublicPlace
            },
            createdAt: Date.now(),
            scheduledFor: new Date(request.proposedDate + ' ' + request.proposedTime).getTime()
        };

        // Store meetup (in real app, this would go to database)
        console.log(`📅 Meetup created: ${meetupId}`);

        return meetup;
    }

    async findNearbyBuddies(userId, coordinates, radius = 5) {
        try {
            const userProfile = this.userProfiles.get(userId);
            if (!userProfile) {
                throw new Error('User profile not found');
            }

            const nearbyBuddies = [];

            for (const [candidateId, candidateProfile] of this.userProfiles) {
                if (candidateId === userId || !candidateProfile.isActive) continue;

                const distance = this.calculateDistanceFromCoords(
                    coordinates,
                    candidateProfile.location.coordinates
                );

                if (distance <= radius) {
                    nearbyBuddies.push({
                        profile: this.sanitizeProfileForClient(candidateProfile),
                        distance: Math.round(distance * 10) / 10,
                        isOnline: this.isUserOnline(candidateId),
                        lastSeen: this.getUserLastSeen(candidateId)
                    });
                }
            }

            // Sort by distance
            nearbyBuddies.sort((a, b) => a.distance - b.distance);

            return {
                success: true,
                nearbyBuddies: nearbyBuddies,
                searchRadius: radius,
                totalFound: nearbyBuddies.length
            };

        } catch (error) {
            console.error('Find nearby buddies error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async createGroupWorkout(creatorId, groupData) {
        try {
            const creatorProfile = this.userProfiles.get(creatorId);
            if (!creatorProfile) {
                throw new Error('Creator profile not found');
            }

            const groupId = this.generateGroupId();
            
            const group = {
                id: groupId,
                creatorId: creatorId,
                name: groupData.name,
                description: groupData.description,
                activity: groupData.activity,
                skillLevel: groupData.skillLevel,
                maxParticipants: groupData.maxParticipants || 10,
                location: groupData.location,
                schedule: groupData.schedule,
                isRecurring: groupData.isRecurring || false,
                isPublic: groupData.isPublic !== false,
                participants: [creatorId],
                waitingList: [],
                tags: groupData.tags || [],
                requirements: groupData.requirements || [],
                safetyGuidelines: groupData.safetyGuidelines || [],
                status: 'active',
                createdAt: Date.now()
            };

            console.log(`👥 Group workout created: ${group.name} (${groupId})`);

            return {
                success: true,
                group: group,
                groupId: groupId
            };

        } catch (error) {
            console.error('Create group workout error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async joinGroupWorkout(groupId, userId) {
        try {
            // In real implementation, this would fetch from database
            console.log(`👥 User ${userId} joining group ${groupId}`);

            return {
                success: true,
                message: 'Successfully joined group workout'
            };

        } catch (error) {
            console.error('Join group workout error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Utility methods
    calculateDistance(location1, location2) {
        // Simple distance calculation (in real app, use proper geolocation)
        if (!location1.coordinates || !location2.coordinates) {
            return 999; // Return high distance if coordinates not available
        }

        return this.calculateDistanceFromCoords(location1.coordinates, location2.coordinates);
    }

    calculateDistanceFromCoords(coords1, coords2) {
        if (!coords1 || !coords2) return 999;

        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(coords2.lat - coords1.lat);
        const dLon = this.toRad(coords2.lng - coords1.lng);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRad(coords1.lat)) * Math.cos(this.toRad(coords2.lat)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    getFitnessLevelNumber(level) {
        const levels = { beginner: 1, intermediate: 2, advanced: 3 };
        return levels[level] || 1;
    }

    sanitizeProfileForClient(profile) {
        return {
            userId: profile.userId,
            displayName: profile.personalInfo.displayName,
            age: profile.personalInfo.age,
            gender: profile.personalInfo.gender,
            bio: profile.personalInfo.bio,
            profilePhoto: profile.personalInfo.profilePhoto,
            verified: profile.personalInfo.verified,
            fitnessLevel: profile.fitnessInfo.level,
            goals: profile.fitnessInfo.goals,
            activities: profile.fitnessInfo.preferredActivities,
            workoutFrequency: profile.fitnessInfo.workoutFrequency,
            city: profile.location.city,
            state: profile.location.state,
            rating: profile.stats.rating,
            totalMeetups: profile.stats.totalMeetups,
            badges: profile.stats.badges,
            lastActive: profile.updatedAt
        };
    }

    isUserOnline(userId) {
        // Simulate online status
        return Math.random() > 0.7;
    }

    getUserLastSeen(userId) {
        // Simulate last seen time
        const hoursAgo = Math.floor(Math.random() * 24);
        return Date.now() - (hoursAgo * 60 * 60 * 1000);
    }

    async notifyMeetupRequest(userId, request) {
        console.log(`📨 Notifying user ${userId} of meetup request`);
    }

    async notifyMeetupAccepted(userId, request, meetup) {
        console.log(`✅ Notifying user ${userId} of meetup acceptance`);
    }

    async notifyMeetupDeclined(userId, request) {
        console.log(`❌ Notifying user ${userId} of meetup decline`);
    }

    generateSearchId() {
        return 'search_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    generateRequestId() {
        return 'request_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    generateMeetupId() {
        return 'meetup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    generateGroupId() {
        return 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    // Public API methods
    async getUserMatches(userId, limit = 10) {
        const userSearches = Array.from(this.activeSearches.values())
            .filter(search => search.userId === userId)
            .sort((a, b) => b.startedAt - a.startedAt);

        if (userSearches.length === 0) {
            return {
                success: false,
                error: 'No active searches found. Please search for buddies first.'
            };
        }

        const latestSearch = userSearches[0];
        const matches = this.matches.get(latestSearch.id) || [];

        return {
            success: true,
            matches: matches.slice(0, limit),
            searchId: latestSearch.id,
            totalMatches: matches.length
        };
    }

    async getMeetupRequests(userId, type = 'all') {
        const requests = Array.from(this.meetupRequests.values())
            .filter(request => {
                if (type === 'sent') return request.fromUserId === userId;
                if (type === 'received') return request.toUserId === userId;
                return request.fromUserId === userId || request.toUserId === userId;
            })
            .sort((a, b) => b.createdAt - a.createdAt);

        return {
            success: true,
            requests: requests
        };
    }

    async updateBuddyProfile(userId, updates) {
        const profile = this.userProfiles.get(userId);
        if (!profile) {
            return {
                success: false,
                error: 'Profile not found'
            };
        }

        // Deep merge updates
        Object.keys(updates).forEach(key => {
            if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
                profile[key] = { ...profile[key], ...updates[key] };
            } else {
                profile[key] = updates[key];
            }
        });

        profile.updatedAt = Date.now();

        return {
            success: true,
            profile: this.sanitizeProfileForClient(profile)
        };
    }

    getStatus() {
        return {
            totalProfiles: this.userProfiles.size,
            activeSearches: this.activeSearches.size,
            pendingRequests: Array.from(this.meetupRequests.values())
                .filter(r => r.status === 'pending').length,
            totalMatches: Array.from(this.matches.values())
                .reduce((total, matches) => total + matches.length, 0),
            safetyFeatures: Object.keys(this.safetyFeatures).length,
            capabilities: [
                'AI-powered matching',
                'Location-based search',
                'Safety features',
                'Group workouts',
                'Meetup coordination',
                'Compatibility scoring'
            ]
        };
    }
}

module.exports = new BuddyFinderService();