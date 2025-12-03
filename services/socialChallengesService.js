/**
 * Social Challenges Service
 * Community-driven fitness challenges with real-time competition
 */

class SocialChallengesService {
    constructor() {
        this.activeChallenges = new Map();
        this.userParticipation = new Map();
        this.leaderboards = new Map();
        this.challengeTemplates = this.initializeChallengeTemplates();
        this.socialFeatures = this.initializeSocialFeatures();
    }

    initializeChallengeTemplates() {
        return {
            workout_streak: {
                name: "Workout Warrior",
                description: "Complete workouts for consecutive days",
                type: "streak",
                duration: 30, // days
                metrics: ["workout_days"],
                rewards: {
                    bronze: { threshold: 7, points: 100, badge: "7-Day Warrior" },
                    silver: { threshold: 14, points: 250, badge: "2-Week Champion" },
                    gold: { threshold: 30, points: 500, badge: "Month Master" }
                },
                difficulty: "medium"
            },
            step_challenge: {
                name: "Step Master",
                description: "Reach daily step goals",
                type: "accumulative",
                duration: 7, // days
                metrics: ["daily_steps"],
                target: 70000, // total steps for week
                rewards: {
                    bronze: { threshold: 50000, points: 150, badge: "Step Starter" },
                    silver: { threshold: 60000, points: 300, badge: "Step Achiever" },
                    gold: { threshold: 70000, points: 600, badge: "Step Master" }
                },
                difficulty: "easy"
            },
            calorie_burn: {
                name: "Calorie Crusher",
                description: "Burn the most calories in a week",
                type: "competitive",
                duration: 7,
                metrics: ["calories_burned"],
                rewards: {
                    participation: { points: 50, badge: "Calorie Participant" },
                    top10: { points: 200, badge: "Top 10 Burner" },
                    top3: { points: 400, badge: "Calorie Elite" },
                    winner: { points: 800, badge: "Calorie Champion" }
                },
                difficulty: "hard"
            },
            hydration_hero: {
                name: "Hydration Hero",
                description: "Meet daily water intake goals",
                type: "consistency",
                duration: 14,
                metrics: ["water_intake"],
                target: 2500, // ml per day
                rewards: {
                    bronze: { threshold: 0.7, points: 100, badge: "Hydration Starter" },
                    silver: { threshold: 0.85, points: 200, badge: "Hydration Pro" },
                    gold: { threshold: 1.0, points: 400, badge: "Hydration Hero" }
                },
                difficulty: "easy"
            },
            strength_builder: {
                name: "Strength Builder",
                description: "Complete strength training sessions",
                type: "goal_based",
                duration: 21,
                metrics: ["strength_workouts"],
                target: 12, // workouts in 3 weeks
                rewards: {
                    bronze: { threshold: 8, points: 200, badge: "Strength Starter" },
                    silver: { threshold: 10, points: 350, badge: "Strength Achiever" },
                    gold: { threshold: 12, points: 600, badge: "Strength Master" }
                },
                difficulty: "medium"
            },
            mindful_movement: {
                name: "Mindful Movement",
                description: "Practice yoga or meditation daily",
                type: "streak",
                duration: 14,
                metrics: ["mindfulness_sessions"],
                rewards: {
                    bronze: { threshold: 7, points: 150, badge: "Mindful Beginner" },
                    silver: { threshold: 10, points: 250, badge: "Mindful Practitioner" },
                    gold: { threshold: 14, points: 450, badge: "Mindful Master" }
                },
                difficulty: "easy"
            }
        };
    }

    initializeSocialFeatures() {
        return {
            teamChallenges: new Map(),
            friendCompetitions: new Map(),
            communityEvents: new Map(),
            motivationalPosts: [],
            achievementSharing: new Map()
        };
    }

    async createChallenge(creatorId, challengeData) {
        try {
            const challengeId = this.generateChallengeId();
            const template = this.challengeTemplates[challengeData.templateId];
            
            if (!template) {
                throw new Error('Invalid challenge template');
            }

            const challenge = {
                id: challengeId,
                creatorId: creatorId,
                name: challengeData.name || template.name,
                description: challengeData.description || template.description,
                type: template.type,
                template: template,
                startDate: challengeData.startDate || Date.now(),
                endDate: challengeData.startDate ? 
                    challengeData.startDate + (template.duration * 24 * 60 * 60 * 1000) :
                    Date.now() + (template.duration * 24 * 60 * 60 * 1000),
                participants: new Map(),
                leaderboard: [],
                isPublic: challengeData.isPublic !== false,
                maxParticipants: challengeData.maxParticipants || 100,
                inviteOnly: challengeData.inviteOnly || false,
                tags: challengeData.tags || [],
                status: 'active',
                socialFeatures: {
                    allowComments: true,
                    allowSharing: true,
                    showLeaderboard: true,
                    enableTeams: challengeData.enableTeams || false
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            // Add creator as first participant
            await this.joinChallenge(challengeId, creatorId);

            this.activeChallenges.set(challengeId, challenge);

            console.log(`✅ Challenge created: ${challenge.name} (${challengeId})`);

            return {
                success: true,
                challenge: this.sanitizeChallengeForClient(challenge),
                challengeId: challengeId
            };

        } catch (error) {
            console.error('Create challenge error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async joinChallenge(challengeId, userId, teamId = null) {
        try {
            const challenge = this.activeChallenges.get(challengeId);
            if (!challenge) {
                throw new Error('Challenge not found');
            }

            if (challenge.status !== 'active') {
                throw new Error('Challenge is not active');
            }

            if (challenge.participants.has(userId)) {
                throw new Error('Already participating in this challenge');
            }

            if (challenge.participants.size >= challenge.maxParticipants) {
                throw new Error('Challenge is full');
            }

            // Add participant
            const participant = {
                userId: userId,
                joinedAt: Date.now(),
                progress: 0,
                metrics: {},
                teamId: teamId,
                achievements: [],
                lastUpdate: Date.now(),
                isActive: true
            };

            challenge.participants.set(userId, participant);
            challenge.updatedAt = Date.now();

            // Update user participation tracking
            const userChallenges = this.userParticipation.get(userId) || [];
            userChallenges.push({
                challengeId: challengeId,
                joinedAt: Date.now(),
                status: 'active'
            });
            this.userParticipation.set(userId, userChallenges);

            // Update leaderboard
            this.updateLeaderboard(challengeId);

            console.log(`✅ User ${userId} joined challenge ${challengeId}`);

            return {
                success: true,
                message: 'Successfully joined challenge',
                participant: participant
            };

        } catch (error) {
            console.error('Join challenge error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async updateProgress(challengeId, userId, metrics) {
        try {
            const challenge = this.activeChallenges.get(challengeId);
            if (!challenge) {
                throw new Error('Challenge not found');
            }

            const participant = challenge.participants.get(userId);
            if (!participant) {
                throw new Error('Not participating in this challenge');
            }

            // Update metrics based on challenge type
            const updatedMetrics = this.calculateMetrics(challenge.template, participant.metrics, metrics);
            const newProgress = this.calculateProgress(challenge.template, updatedMetrics);

            participant.metrics = updatedMetrics;
            participant.progress = newProgress;
            participant.lastUpdate = Date.now();

            // Check for achievements
            const newAchievements = this.checkAchievements(challenge.template, participant);
            if (newAchievements.length > 0) {
                participant.achievements.push(...newAchievements);
                
                // Notify about achievements
                await this.notifyAchievements(userId, challengeId, newAchievements);
            }

            challenge.updatedAt = Date.now();

            // Update leaderboard
            this.updateLeaderboard(challengeId);

            return {
                success: true,
                progress: newProgress,
                achievements: newAchievements,
                rank: this.getUserRank(challengeId, userId)
            };

        } catch (error) {
            console.error('Update progress error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    calculateMetrics(template, currentMetrics, newData) {
        const updated = { ...currentMetrics };

        switch (template.type) {
            case 'streak':
                // For streak challenges, track consecutive days
                if (newData.completed) {
                    updated.currentStreak = (updated.currentStreak || 0) + 1;
                    updated.longestStreak = Math.max(updated.longestStreak || 0, updated.currentStreak);
                } else {
                    updated.currentStreak = 0;
                }
                updated.totalDays = (updated.totalDays || 0) + 1;
                break;

            case 'accumulative':
                // For accumulative challenges, sum up values
                template.metrics.forEach(metric => {
                    if (newData[metric] !== undefined) {
                        updated[metric] = (updated[metric] || 0) + newData[metric];
                    }
                });
                break;

            case 'competitive':
                // For competitive challenges, track totals
                template.metrics.forEach(metric => {
                    if (newData[metric] !== undefined) {
                        updated[metric] = (updated[metric] || 0) + newData[metric];
                    }
                });
                break;

            case 'consistency':
                // For consistency challenges, track daily completion rate
                if (newData.dailyTarget && newData.dailyActual) {
                    const dailyRate = Math.min(newData.dailyActual / newData.dailyTarget, 1);
                    updated.dailyRates = updated.dailyRates || [];
                    updated.dailyRates.push(dailyRate);
                    updated.averageRate = updated.dailyRates.reduce((a, b) => a + b, 0) / updated.dailyRates.length;
                }
                break;

            case 'goal_based':
                // For goal-based challenges, track completion count
                if (newData.completed) {
                    updated.completedSessions = (updated.completedSessions || 0) + 1;
                }
                break;
        }

        return updated;
    }

    calculateProgress(template, metrics) {
        switch (template.type) {
            case 'streak':
                return Math.min((metrics.currentStreak || 0) / template.duration, 1) * 100;

            case 'accumulative':
                const totalValue = template.metrics.reduce((sum, metric) => {
                    return sum + (metrics[metric] || 0);
                }, 0);
                return Math.min(totalValue / template.target, 1) * 100;

            case 'competitive':
                // Progress is relative to other participants
                return metrics[template.metrics[0]] || 0;

            case 'consistency':
                return (metrics.averageRate || 0) * 100;

            case 'goal_based':
                return Math.min((metrics.completedSessions || 0) / template.target, 1) * 100;

            default:
                return 0;
        }
    }

    checkAchievements(template, participant) {
        const achievements = [];
        const progress = participant.progress;
        const metrics = participant.metrics;

        // Check reward thresholds
        Object.entries(template.rewards).forEach(([level, reward]) => {
            if (reward.threshold && progress >= reward.threshold) {
                const achievementId = `${level}_${template.name.replace(/\s+/g, '_').toLowerCase()}`;
                
                // Check if already achieved
                if (!participant.achievements.find(a => a.id === achievementId)) {
                    achievements.push({
                        id: achievementId,
                        level: level,
                        name: reward.badge,
                        points: reward.points,
                        unlockedAt: Date.now(),
                        description: `Achieved ${level} level in ${template.name}`
                    });
                }
            }
        });

        return achievements;
    }

    updateLeaderboard(challengeId) {
        const challenge = this.activeChallenges.get(challengeId);
        if (!challenge) return;

        const leaderboard = Array.from(challenge.participants.entries())
            .map(([userId, participant]) => ({
                userId: userId,
                progress: participant.progress,
                metrics: participant.metrics,
                achievements: participant.achievements.length,
                lastUpdate: participant.lastUpdate,
                teamId: participant.teamId
            }))
            .sort((a, b) => {
                // Sort by progress, then by last update (earlier is better for ties)
                if (b.progress !== a.progress) {
                    return b.progress - a.progress;
                }
                return a.lastUpdate - b.lastUpdate;
            })
            .map((entry, index) => ({
                ...entry,
                rank: index + 1
            }));

        challenge.leaderboard = leaderboard;
        this.leaderboards.set(challengeId, leaderboard);
    }

    async createTeamChallenge(creatorId, challengeData, teamData) {
        try {
            // Create the challenge first
            const challengeResult = await this.createChallenge(creatorId, {
                ...challengeData,
                enableTeams: true
            });

            if (!challengeResult.success) {
                return challengeResult;
            }

            const challengeId = challengeResult.challengeId;

            // Create teams
            const teams = [];
            for (const team of teamData.teams) {
                const teamId = this.generateTeamId();
                teams.push({
                    id: teamId,
                    name: team.name,
                    members: [],
                    totalProgress: 0,
                    averageProgress: 0,
                    createdAt: Date.now()
                });
            }

            this.socialFeatures.teamChallenges.set(challengeId, {
                challengeId: challengeId,
                teams: teams,
                teamSize: teamData.teamSize || 5,
                allowSelfAssign: teamData.allowSelfAssign || false
            });

            return {
                success: true,
                challenge: challengeResult.challenge,
                teams: teams,
                challengeId: challengeId
            };

        } catch (error) {
            console.error('Create team challenge error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async joinTeam(challengeId, userId, teamId) {
        try {
            const teamChallenge = this.socialFeatures.teamChallenges.get(challengeId);
            if (!teamChallenge) {
                throw new Error('Team challenge not found');
            }

            const team = teamChallenge.teams.find(t => t.id === teamId);
            if (!team) {
                throw new Error('Team not found');
            }

            if (team.members.length >= teamChallenge.teamSize) {
                throw new Error('Team is full');
            }

            // Join the challenge with team ID
            const joinResult = await this.joinChallenge(challengeId, userId, teamId);
            if (!joinResult.success) {
                return joinResult;
            }

            // Add to team
            team.members.push({
                userId: userId,
                joinedAt: Date.now(),
                role: team.members.length === 0 ? 'captain' : 'member'
            });

            return {
                success: true,
                message: 'Successfully joined team',
                team: team
            };

        } catch (error) {
            console.error('Join team error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async createFriendCompetition(creatorId, friendIds, challengeTemplate, settings = {}) {
        try {
            const competitionId = this.generateCompetitionId();
            
            const competition = {
                id: competitionId,
                creatorId: creatorId,
                participants: [creatorId, ...friendIds],
                template: challengeTemplate,
                settings: {
                    duration: settings.duration || 7, // days
                    isPrivate: settings.isPrivate !== false,
                    allowTrashTalk: settings.allowTrashTalk || true,
                    showRealTimeUpdates: settings.showRealTimeUpdates !== false
                },
                startDate: settings.startDate || Date.now(),
                endDate: (settings.startDate || Date.now()) + ((settings.duration || 7) * 24 * 60 * 60 * 1000),
                status: 'active',
                leaderboard: [],
                messages: [],
                createdAt: Date.now()
            };

            this.socialFeatures.friendCompetitions.set(competitionId, competition);

            // Send invitations to friends
            await this.sendCompetitionInvites(competitionId, friendIds);

            return {
                success: true,
                competition: competition,
                competitionId: competitionId
            };

        } catch (error) {
            console.error('Create friend competition error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendMotivationalMessage(challengeId, userId, message, type = 'encouragement') {
        try {
            const challenge = this.activeChallenges.get(challengeId);
            if (!challenge) {
                throw new Error('Challenge not found');
            }

            if (!challenge.participants.has(userId)) {
                throw new Error('Not participating in this challenge');
            }

            const motivationalPost = {
                id: this.generatePostId(),
                challengeId: challengeId,
                userId: userId,
                message: message,
                type: type, // encouragement, celebration, support, trash_talk
                timestamp: Date.now(),
                likes: [],
                replies: []
            };

            this.socialFeatures.motivationalPosts.push(motivationalPost);

            // Notify other participants
            await this.notifyParticipants(challengeId, userId, 'motivational_message', {
                message: message,
                type: type
            });

            return {
                success: true,
                post: motivationalPost
            };

        } catch (error) {
            console.error('Send motivational message error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async shareAchievement(userId, achievementId, challengeId, message = '') {
        try {
            const shareId = this.generateShareId();
            
            const share = {
                id: shareId,
                userId: userId,
                achievementId: achievementId,
                challengeId: challengeId,
                message: message,
                timestamp: Date.now(),
                likes: [],
                comments: [],
                visibility: 'friends' // friends, public, challenge_participants
            };

            this.socialFeatures.achievementSharing.set(shareId, share);

            // Notify friends and challenge participants
            await this.notifyAchievementShare(userId, share);

            return {
                success: true,
                share: share
            };

        } catch (error) {
            console.error('Share achievement error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Query methods
    async getActiveChallenges(userId, filters = {}) {
        try {
            let challenges = Array.from(this.activeChallenges.values());

            // Apply filters
            if (filters.type) {
                challenges = challenges.filter(c => c.template.type === filters.type);
            }

            if (filters.difficulty) {
                challenges = challenges.filter(c => c.template.difficulty === filters.difficulty);
            }

            if (filters.participating) {
                challenges = challenges.filter(c => c.participants.has(userId));
            }

            if (filters.notParticipating) {
                challenges = challenges.filter(c => !c.participants.has(userId));
            }

            // Sort by relevance (participating first, then by participant count)
            challenges.sort((a, b) => {
                const aParticipating = a.participants.has(userId) ? 1 : 0;
                const bParticipating = b.participants.has(userId) ? 1 : 0;
                
                if (bParticipating !== aParticipating) {
                    return bParticipating - aParticipating;
                }
                
                return b.participants.size - a.participants.size;
            });

            return {
                success: true,
                challenges: challenges.map(c => this.sanitizeChallengeForClient(c))
            };

        } catch (error) {
            console.error('Get active challenges error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getChallengeLeaderboard(challengeId, limit = 50) {
        try {
            const leaderboard = this.leaderboards.get(challengeId);
            if (!leaderboard) {
                throw new Error('Challenge not found');
            }

            return {
                success: true,
                leaderboard: leaderboard.slice(0, limit)
            };

        } catch (error) {
            console.error('Get leaderboard error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getUserChallengeStats(userId) {
        try {
            const userChallenges = this.userParticipation.get(userId) || [];
            const stats = {
                totalChallenges: userChallenges.length,
                activeChallenges: 0,
                completedChallenges: 0,
                totalPoints: 0,
                achievements: 0,
                averageRank: 0,
                bestRank: Infinity,
                challengeTypes: {}
            };

            let totalRank = 0;
            let rankedChallenges = 0;

            for (const userChallenge of userChallenges) {
                const challenge = this.activeChallenges.get(userChallenge.challengeId);
                if (!challenge) continue;

                if (challenge.status === 'active') {
                    stats.activeChallenges++;
                } else if (challenge.status === 'completed') {
                    stats.completedChallenges++;
                }

                const participant = challenge.participants.get(userId);
                if (participant) {
                    stats.totalPoints += participant.achievements.reduce((sum, ach) => sum + ach.points, 0);
                    stats.achievements += participant.achievements.length;

                    const rank = this.getUserRank(userChallenge.challengeId, userId);
                    if (rank > 0) {
                        totalRank += rank;
                        rankedChallenges++;
                        stats.bestRank = Math.min(stats.bestRank, rank);
                    }
                }

                // Count challenge types
                const type = challenge.template.type;
                stats.challengeTypes[type] = (stats.challengeTypes[type] || 0) + 1;
            }

            stats.averageRank = rankedChallenges > 0 ? Math.round(totalRank / rankedChallenges) : 0;
            if (stats.bestRank === Infinity) stats.bestRank = 0;

            return {
                success: true,
                stats: stats
            };

        } catch (error) {
            console.error('Get user challenge stats error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Utility methods
    getUserRank(challengeId, userId) {
        const leaderboard = this.leaderboards.get(challengeId);
        if (!leaderboard) return 0;

        const entry = leaderboard.find(e => e.userId === userId);
        return entry ? entry.rank : 0;
    }

    sanitizeChallengeForClient(challenge) {
        return {
            id: challenge.id,
            name: challenge.name,
            description: challenge.description,
            type: challenge.type,
            template: challenge.template,
            startDate: challenge.startDate,
            endDate: challenge.endDate,
            participantCount: challenge.participants.size,
            maxParticipants: challenge.maxParticipants,
            isPublic: challenge.isPublic,
            tags: challenge.tags,
            status: challenge.status,
            socialFeatures: challenge.socialFeatures,
            createdAt: challenge.createdAt
        };
    }

    async notifyAchievements(userId, challengeId, achievements) {
        // This would integrate with the notification service
        console.log(`🏆 User ${userId} earned ${achievements.length} achievements in challenge ${challengeId}`);
    }

    async notifyParticipants(challengeId, senderId, type, data) {
        // This would integrate with the notification service
        console.log(`📢 Notifying participants of challenge ${challengeId} about ${type}`);
    }

    async sendCompetitionInvites(competitionId, friendIds) {
        // This would integrate with the notification service
        console.log(`📨 Sending competition invites for ${competitionId} to ${friendIds.length} friends`);
    }

    async notifyAchievementShare(userId, share) {
        // This would integrate with the notification service
        console.log(`🎉 User ${userId} shared an achievement`);
    }

    generateChallengeId() {
        return 'challenge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateTeamId() {
        return 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    generateCompetitionId() {
        return 'comp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    generatePostId() {
        return 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    generateShareId() {
        return 'share_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    getStatus() {
        return {
            activeChallenges: this.activeChallenges.size,
            totalParticipants: Array.from(this.activeChallenges.values())
                .reduce((total, challenge) => total + challenge.participants.size, 0),
            teamChallenges: this.socialFeatures.teamChallenges.size,
            friendCompetitions: this.socialFeatures.friendCompetitions.size,
            motivationalPosts: this.socialFeatures.motivationalPosts.length,
            achievementShares: this.socialFeatures.achievementSharing.size
        };
    }
}

module.exports = new SocialChallengesService();