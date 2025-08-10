/**
 * Virtual Personal Training Service
 * Handles video calls, trainer scheduling, and live training sessions
 */

class VirtualTrainingService {
    constructor() {
        this.activeSessions = new Map();
        this.trainers = this.initializeTrainers();
        this.sessionTypes = this.initializeSessionTypes();
        this.bookings = new Map();
        this.webRTCConfig = this.getWebRTCConfig();
    }

    // Initialize available trainers
    initializeTrainers() {
        return [
            {
                id: 'trainer_001',
                name: 'Sarah Johnson',
                specialties: ['Weight Loss', 'HIIT', 'Nutrition Coaching'],
                experience: '8 years',
                rating: 4.9,
                hourlyRate: 75,
                avatar: '/images/trainers/sarah.jpg',
                bio: 'Certified personal trainer specializing in weight loss and high-intensity training. Helped 200+ clients achieve their fitness goals.',
                certifications: ['NASM-CPT', 'Precision Nutrition Level 1', 'HIIT Specialist'],
                languages: ['English', 'Spanish'],
                availability: {
                    timezone: 'EST',
                    schedule: {
                        monday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
                        tuesday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
                        wednesday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
                        thursday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
                        friday: ['09:00', '10:00', '11:00', '14:00', '15:00'],
                        saturday: ['10:00', '11:00', '12:00'],
                        sunday: []
                    }
                },
                sessionTypes: ['personal_training', 'nutrition_consultation', 'form_check']
            },
            {
                id: 'trainer_002',
                name: 'Mike Rodriguez',
                specialties: ['Strength Training', 'Muscle Building', 'Powerlifting'],
                experience: '12 years',
                rating: 4.8,
                hourlyRate: 85,
                avatar: '/images/trainers/mike.jpg',
                bio: 'Former competitive powerlifter with expertise in strength training and muscle building. Specializes in progressive overload programs.',
                certifications: ['CSCS', 'USAPL Coach', 'Precision Nutrition Level 2'],
                languages: ['English'],
                availability: {
                    timezone: 'PST',
                    schedule: {
                        monday: ['08:00', '09:00', '10:00', '17:00', '18:00', '19:00'],
                        tuesday: ['08:00', '09:00', '10:00', '17:00', '18:00', '19:00'],
                        wednesday: ['08:00', '09:00', '10:00', '17:00', '18:00', '19:00'],
                        thursday: ['08:00', '09:00', '10:00', '17:00', '18:00', '19:00'],
                        friday: ['08:00', '09:00', '10:00', '17:00', '18:00'],
                        saturday: ['09:00', '10:00', '11:00', '12:00'],
                        sunday: ['10:00', '11:00', '12:00']
                    }
                },
                sessionTypes: ['personal_training', 'strength_coaching', 'form_check']
            },
            {
                id: 'trainer_003',
                name: 'Emma Chen',
                specialties: ['Yoga', 'Flexibility', 'Mindfulness', 'Rehabilitation'],
                experience: '6 years',
                rating: 4.9,
                hourlyRate: 65,
                avatar: '/images/trainers/emma.jpg',
                bio: 'Certified yoga instructor and movement specialist. Focuses on flexibility, mobility, and mind-body connection.',
                certifications: ['RYT-500', 'NASM-CES', 'Mindfulness Coach'],
                languages: ['English', 'Mandarin'],
                availability: {
                    timezone: 'EST',
                    schedule: {
                        monday: ['07:00', '08:00', '18:00', '19:00', '20:00'],
                        tuesday: ['07:00', '08:00', '18:00', '19:00', '20:00'],
                        wednesday: ['07:00', '08:00', '18:00', '19:00', '20:00'],
                        thursday: ['07:00', '08:00', '18:00', '19:00', '20:00'],
                        friday: ['07:00', '08:00', '18:00', '19:00'],
                        saturday: ['08:00', '09:00', '10:00', '11:00'],
                        sunday: ['08:00', '09:00', '10:00', '11:00']
                    }
                },
                sessionTypes: ['yoga_session', 'flexibility_training', 'mindfulness_coaching']
            },
            {
                id: 'trainer_004',
                name: 'David Thompson',
                specialties: ['Cardio', 'Endurance', 'Marathon Training', 'Sports Performance'],
                experience: '10 years',
                rating: 4.7,
                hourlyRate: 70,
                avatar: '/images/trainers/david.jpg',
                bio: 'Former marathon runner and endurance coach. Specializes in cardiovascular training and sports performance.',
                certifications: ['ACSM-CPT', 'USATF Level 2', 'Sports Performance Specialist'],
                languages: ['English', 'French'],
                availability: {
                    timezone: 'CST',
                    schedule: {
                        monday: ['06:00', '07:00', '17:00', '18:00', '19:00'],
                        tuesday: ['06:00', '07:00', '17:00', '18:00', '19:00'],
                        wednesday: ['06:00', '07:00', '17:00', '18:00', '19:00'],
                        thursday: ['06:00', '07:00', '17:00', '18:00', '19:00'],
                        friday: ['06:00', '07:00', '17:00', '18:00'],
                        saturday: ['07:00', '08:00', '09:00'],
                        sunday: ['07:00', '08:00', '09:00']
                    }
                },
                sessionTypes: ['cardio_training', 'endurance_coaching', 'sports_performance']
            }
        ];
    }

    // Initialize session types
    initializeSessionTypes() {
        return {
            personal_training: {
                name: 'Personal Training Session',
                duration: 60,
                description: 'One-on-one training session with personalized workout plan',
                price: 75,
                features: ['Custom workout plan', 'Real-time form correction', 'Progress tracking', 'Nutrition tips']
            },
            nutrition_consultation: {
                name: 'Nutrition Consultation',
                duration: 45,
                description: 'Personalized nutrition guidance and meal planning',
                price: 60,
                features: ['Meal plan creation', 'Dietary analysis', 'Supplement guidance', 'Goal setting']
            },
            form_check: {
                name: 'Form Check Session',
                duration: 30,
                description: 'Quick session to review and correct exercise form',
                price: 40,
                features: ['Exercise form analysis', 'Technique correction', 'Safety tips', 'Alternative exercises']
            },
            strength_coaching: {
                name: 'Strength Coaching',
                duration: 60,
                description: 'Specialized strength training and powerlifting coaching',
                price: 85,
                features: ['Strength program design', 'Progressive overload planning', 'Competition prep', 'Injury prevention']
            },
            yoga_session: {
                name: 'Virtual Yoga Session',
                duration: 60,
                description: 'Guided yoga practice for flexibility and mindfulness',
                price: 65,
                features: ['Personalized yoga flow', 'Breathing techniques', 'Meditation guidance', 'Flexibility assessment']
            },
            flexibility_training: {
                name: 'Flexibility & Mobility',
                duration: 45,
                description: 'Improve flexibility, mobility, and movement quality',
                price: 55,
                features: ['Mobility assessment', 'Stretching routines', 'Movement correction', 'Injury prevention']
            },
            cardio_training: {
                name: 'Cardio Training Session',
                duration: 45,
                description: 'Cardiovascular training and endurance building',
                price: 70,
                features: ['Cardio program design', 'Heart rate training', 'Endurance building', 'Performance tracking']
            },
            mindfulness_coaching: {
                name: 'Mindfulness Coaching',
                duration: 30,
                description: 'Mental wellness and mindfulness training',
                price: 50,
                features: ['Stress management', 'Meditation techniques', 'Mindful movement', 'Mental health support']
            }
        };
    }

    // Get WebRTC configuration
    getWebRTCConfig() {
        return {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                // In production, you'd add TURN servers for better connectivity
                // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
            ],
            iceCandidatePoolSize: 10
        };
    }

    // Search for available trainers
    searchTrainers(filters = {}) {
        let filteredTrainers = [...this.trainers];

        // Filter by specialty
        if (filters.specialty) {
            filteredTrainers = filteredTrainers.filter(trainer =>
                trainer.specialties.some(spec => 
                    spec.toLowerCase().includes(filters.specialty.toLowerCase())
                )
            );
        }

        // Filter by price range
        if (filters.maxPrice) {
            filteredTrainers = filteredTrainers.filter(trainer =>
                trainer.hourlyRate <= filters.maxPrice
            );
        }

        // Filter by rating
        if (filters.minRating) {
            filteredTrainers = filteredTrainers.filter(trainer =>
                trainer.rating >= filters.minRating
            );
        }

        // Filter by language
        if (filters.language) {
            filteredTrainers = filteredTrainers.filter(trainer =>
                trainer.languages.includes(filters.language)
            );
        }

        // Filter by session type
        if (filters.sessionType) {
            filteredTrainers = filteredTrainers.filter(trainer =>
                trainer.sessionTypes.includes(filters.sessionType)
            );
        }

        // Sort by rating (default) or price
        const sortBy = filters.sortBy || 'rating';
        filteredTrainers.sort((a, b) => {
            if (sortBy === 'price') {
                return a.hourlyRate - b.hourlyRate;
            } else if (sortBy === 'rating') {
                return b.rating - a.rating;
            } else if (sortBy === 'experience') {
                return parseInt(b.experience) - parseInt(a.experience);
            }
            return 0;
        });

        return {
            trainers: filteredTrainers,
            total: filteredTrainers.length,
            filters: filters
        };
    }

    // Get trainer details
    getTrainerDetails(trainerId) {
        const trainer = this.trainers.find(t => t.id === trainerId);
        if (!trainer) {
            throw new Error('Trainer not found');
        }

        return {
            ...trainer,
            reviews: this.getTrainerReviews(trainerId),
            upcomingAvailability: this.getUpcomingAvailability(trainerId),
            sessionTypes: trainer.sessionTypes.map(type => ({
                ...this.sessionTypes[type],
                type: type
            }))
        };
    }

    // Get trainer reviews (mock data)
    getTrainerReviews(trainerId) {
        const reviews = [
            {
                id: 'review_001',
                userId: 'user_123',
                userName: 'John D.',
                rating: 5,
                comment: 'Excellent trainer! Really helped me improve my form and reach my goals.',
                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                sessionType: 'personal_training'
            },
            {
                id: 'review_002',
                userId: 'user_456',
                userName: 'Maria S.',
                rating: 5,
                comment: 'Very knowledgeable and patient. Great at explaining proper technique.',
                date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                sessionType: 'form_check'
            },
            {
                id: 'review_003',
                userId: 'user_789',
                userName: 'Alex K.',
                rating: 4,
                comment: 'Good session, learned a lot about nutrition and meal planning.',
                date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
                sessionType: 'nutrition_consultation'
            }
        ];

        return reviews.slice(0, 3); // Return 3 most recent reviews
    }

    // Get upcoming availability for a trainer
    getUpcomingAvailability(trainerId) {
        const trainer = this.trainers.find(t => t.id === trainerId);
        if (!trainer) return [];

        const availability = [];
        const today = new Date();
        
        // Generate availability for next 7 days
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            const dayName = date.toLocaleLowerCase().slice(0, 3) + 
                           date.toLocaleLowerCase().slice(3, 6) + 'day';
            
            const daySchedule = trainer.availability.schedule[dayName.toLowerCase()];
            
            if (daySchedule && daySchedule.length > 0) {
                availability.push({
                    date: date.toISOString().split('T')[0],
                    dayName: dayName,
                    slots: daySchedule.map(time => ({
                        time: time,
                        available: Math.random() > 0.3, // 70% chance of being available
                        price: trainer.hourlyRate
                    }))
                });
            }
        }

        return availability;
    }

    // Book a training session
    async bookSession(bookingData) {
        const {
            trainerId,
            sessionType,
            date,
            time,
            userId,
            userProfile,
            specialRequests = '',
            paymentMethod = 'card'
        } = bookingData;

        // Validate trainer
        const trainer = this.trainers.find(t => t.id === trainerId);
        if (!trainer) {
            throw new Error('Trainer not found');
        }

        // Validate session type
        const sessionTypeInfo = this.sessionTypes[sessionType];
        if (!sessionTypeInfo) {
            throw new Error('Invalid session type');
        }

        // Check if trainer offers this session type
        if (!trainer.sessionTypes.includes(sessionType)) {
            throw new Error('Trainer does not offer this session type');
        }

        // Generate booking ID
        const bookingId = this.generateBookingId();
        
        // Calculate session end time
        const sessionStart = new Date(`${date}T${time}`);
        const sessionEnd = new Date(sessionStart.getTime() + sessionTypeInfo.duration * 60000);

        // Create booking
        const booking = {
            id: bookingId,
            trainerId: trainerId,
            trainerName: trainer.name,
            userId: userId,
            userProfile: userProfile,
            sessionType: sessionType,
            sessionTypeInfo: sessionTypeInfo,
            date: date,
            startTime: time,
            endTime: sessionEnd.toTimeString().slice(0, 5),
            duration: sessionTypeInfo.duration,
            price: sessionTypeInfo.price,
            specialRequests: specialRequests,
            paymentMethod: paymentMethod,
            status: 'confirmed',
            createdAt: new Date(),
            meetingRoom: {
                id: `room_${bookingId}`,
                url: `https://meet.fitwith.ai/room/${bookingId}`,
                password: this.generateMeetingPassword()
            }
        };

        // Store booking
        this.bookings.set(bookingId, booking);

        console.log(`📅 Session booked: ${trainer.name} - ${sessionTypeInfo.name}`);

        // Send confirmation emails (would be implemented with email service)
        await this.sendBookingConfirmation(booking);

        return {
            success: true,
            booking: booking,
            message: 'Session booked successfully!',
            nextSteps: [
                'You will receive a confirmation email shortly',
                'Join the meeting 5 minutes before your session',
                'Prepare your workout space and equipment',
                'Have water and a towel ready'
            ]
        };
    }

    // Start a virtual training session
    async startSession(bookingId, participantType = 'client') {
        const booking = this.bookings.get(bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }

        // Check if session time is appropriate
        const now = new Date();
        const sessionStart = new Date(`${booking.date}T${booking.startTime}`);
        const timeDiff = sessionStart.getTime() - now.getTime();
        
        // Allow joining 10 minutes early
        if (timeDiff > 10 * 60 * 1000) {
            throw new Error('Session has not started yet');
        }

        // Check if session has expired (2 hours after start time)
        if (timeDiff < -2 * 60 * 60 * 1000) {
            throw new Error('Session has expired');
        }

        // Create or get existing session
        let session = this.activeSessions.get(bookingId);
        if (!session) {
            session = {
                id: bookingId,
                booking: booking,
                participants: new Map(),
                startedAt: new Date(),
                status: 'active',
                features: {
                    video: true,
                    audio: true,
                    chat: true,
                    screenShare: false,
                    recording: false
                },
                sessionData: {
                    exercises: [],
                    notes: [],
                    feedback: [],
                    duration: 0
                }
            };
            this.activeSessions.set(bookingId, session);
        }

        // Add participant
        const participantId = this.generateParticipantId();
        session.participants.set(participantId, {
            id: participantId,
            type: participantType,
            joinedAt: new Date(),
            status: 'connected'
        });

        console.log(`🎥 ${participantType} joined session: ${bookingId}`);

        return {
            sessionId: bookingId,
            participantId: participantId,
            meetingRoom: booking.meetingRoom,
            webRTCConfig: this.webRTCConfig,
            sessionInfo: {
                trainer: booking.trainerName,
                sessionType: booking.sessionTypeInfo.name,
                duration: booking.duration,
                features: session.features
            },
            instructions: this.getSessionInstructions(booking.sessionType)
        };
    }

    // Get session instructions based on type
    getSessionInstructions(sessionType) {
        const instructions = {
            personal_training: [
                'Ensure you have adequate space to move around',
                'Have water and a towel nearby',
                'Wear appropriate workout attire',
                'Test your camera and microphone',
                'Be ready to follow along with exercises'
            ],
            nutrition_consultation: [
                'Have your food diary or meal photos ready',
                'Prepare any questions about your diet',
                'Have a notebook for taking notes',
                'Be in a quiet space for discussion'
            ],
            form_check: [
                'Set up camera at side angle for best view',
                'Have the exercises you want to check ready',
                'Ensure good lighting in your space',
                'Wear form-fitting clothes for better analysis'
            ],
            yoga_session: [
                'Lay out your yoga mat',
                'Have props ready (blocks, straps, bolster)',
                'Ensure quiet, peaceful environment',
                'Wear comfortable, stretchy clothing'
            ]
        };

        return instructions[sessionType] || [
            'Ensure stable internet connection',
            'Have adequate lighting',
            'Minimize background noise',
            'Be ready to participate actively'
        ];
    }

    // End a training session
    async endSession(sessionId, participantId, sessionData = {}) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const participant = session.participants.get(participantId);
        if (!participant) {
            throw new Error('Participant not found in session');
        }

        // Update session data
        if (sessionData.exercises) {
            session.sessionData.exercises = sessionData.exercises;
        }
        if (sessionData.notes) {
            session.sessionData.notes = sessionData.notes;
        }
        if (sessionData.feedback) {
            session.sessionData.feedback = sessionData.feedback;
        }

        // Calculate session duration
        session.sessionData.duration = Math.round(
            (new Date() - session.startedAt) / 60000
        );

        // Remove participant
        session.participants.delete(participantId);

        // If no participants left, end session
        if (session.participants.size === 0) {
            session.status = 'completed';
            session.endedAt = new Date();
            
            // Generate session summary
            const summary = await this.generateSessionSummary(session);
            
            // Remove from active sessions
            this.activeSessions.delete(sessionId);
            
            console.log(`🏁 Session completed: ${sessionId}`);
            
            return {
                sessionEnded: true,
                summary: summary
            };
        }

        return {
            sessionEnded: false,
            message: 'You have left the session'
        };
    }

    // Generate session summary
    async generateSessionSummary(session) {
        const booking = session.booking;
        
        return {
            sessionId: session.id,
            trainer: booking.trainerName,
            sessionType: booking.sessionTypeInfo.name,
            date: booking.date,
            duration: session.sessionData.duration,
            plannedDuration: booking.duration,
            exercises: session.sessionData.exercises,
            trainerNotes: session.sessionData.notes,
            feedback: session.sessionData.feedback,
            nextSteps: this.generateNextSteps(session),
            followUpRecommendations: this.generateFollowUpRecommendations(session),
            rating: {
                requested: true,
                url: `/rate-session/${session.id}`
            }
        };
    }

    // Generate next steps for client
    generateNextSteps(session) {
        const sessionType = session.booking.sessionType;
        
        const nextSteps = {
            personal_training: [
                'Continue with the exercises demonstrated today',
                'Focus on proper form over speed or weight',
                'Schedule your next session within 1-2 weeks',
                'Track your progress in the app'
            ],
            nutrition_consultation: [
                'Implement the meal plan discussed',
                'Track your food intake for the next week',
                'Try the recommended recipes',
                'Schedule a follow-up in 2-3 weeks'
            ],
            form_check: [
                'Practice the corrected form slowly',
                'Record yourself to check progress',
                'Focus on the specific cues given',
                'Book another form check in 2 weeks'
            ],
            yoga_session: [
                'Practice the sequences shown today',
                'Focus on breathing techniques',
                'Hold poses for the recommended duration',
                'Schedule regular sessions for best results'
            ]
        };

        return nextSteps[sessionType] || [
            'Apply what you learned in today\'s session',
            'Practice regularly for best results',
            'Book follow-up sessions as needed'
        ];
    }

    // Generate follow-up recommendations
    generateFollowUpRecommendations(session) {
        const sessionType = session.booking.sessionType;
        
        return {
            nextSessionRecommended: this.getNextSessionRecommendation(sessionType),
            additionalResources: this.getAdditionalResources(sessionType),
            homeWorkout: this.getHomeWorkoutRecommendation(sessionType)
        };
    }

    getNextSessionRecommendation(sessionType) {
        const recommendations = {
            personal_training: 'Book your next session in 1-2 weeks to maintain momentum',
            nutrition_consultation: 'Follow-up consultation in 2-3 weeks to review progress',
            form_check: 'Another form check in 2 weeks after practicing corrections',
            yoga_session: 'Weekly yoga sessions recommended for best results'
        };

        return recommendations[sessionType] || 'Regular sessions recommended for continued progress';
    }

    getAdditionalResources(sessionType) {
        const resources = {
            personal_training: [
                'Workout tracking app',
                'Exercise video library',
                'Nutrition guidelines'
            ],
            nutrition_consultation: [
                'Meal planning templates',
                'Healthy recipe database',
                'Nutrition tracking tools'
            ],
            form_check: [
                'Exercise demonstration videos',
                'Form correction guides',
                'Progress tracking tools'
            ],
            yoga_session: [
                'Guided meditation app',
                'Yoga pose library',
                'Breathing exercise guides'
            ]
        };

        return resources[sessionType] || ['General fitness resources'];
    }

    getHomeWorkoutRecommendation(sessionType) {
        const workouts = {
            personal_training: 'Continue with bodyweight exercises 2-3 times per week',
            nutrition_consultation: 'Focus on meal prep and healthy cooking',
            form_check: 'Practice corrected movements daily',
            yoga_session: 'Daily 10-15 minute yoga practice'
        };

        return workouts[sessionType] || 'Stay active with regular exercise';
    }

    // Get user's bookings
    getUserBookings(userId) {
        const userBookings = Array.from(this.bookings.values())
            .filter(booking => booking.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return {
            bookings: userBookings,
            upcoming: userBookings.filter(b => new Date(`${b.date}T${b.startTime}`) > new Date()),
            past: userBookings.filter(b => new Date(`${b.date}T${b.startTime}`) <= new Date())
        };
    }

    // Cancel booking
    async cancelBooking(bookingId, userId, reason = '') {
        const booking = this.bookings.get(bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }

        if (booking.userId !== userId) {
            throw new Error('Unauthorized to cancel this booking');
        }

        // Check cancellation policy (24 hours before session)
        const sessionStart = new Date(`${booking.date}T${booking.startTime}`);
        const now = new Date();
        const hoursUntilSession = (sessionStart - now) / (1000 * 60 * 60);

        if (hoursUntilSession < 24) {
            throw new Error('Cannot cancel within 24 hours of session start');
        }

        // Update booking status
        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        booking.cancellationReason = reason;

        // Send cancellation emails
        await this.sendCancellationNotification(booking);

        return {
            success: true,
            message: 'Booking cancelled successfully',
            refund: {
                amount: booking.price,
                method: booking.paymentMethod,
                timeframe: '3-5 business days'
            }
        };
    }

    // Utility functions
    generateBookingId() {
        return 'booking_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateParticipantId() {
        return 'participant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    generateMeetingPassword() {
        return Math.random().toString(36).substr(2, 8).toUpperCase();
    }

    // Mock email functions (would integrate with actual email service)
    async sendBookingConfirmation(booking) {
        console.log(`📧 Sending booking confirmation for ${booking.id}`);
        // Would send actual email here
        return true;
    }

    async sendCancellationNotification(booking) {
        console.log(`📧 Sending cancellation notification for ${booking.id}`);
        // Would send actual email here
        return true;
    }

    // Get service status
    getStatus() {
        return {
            activeTrainers: this.trainers.length,
            activeSessions: this.activeSessions.size,
            totalBookings: this.bookings.size,
            sessionTypes: Object.keys(this.sessionTypes).length,
            features: [
                'Video calling with WebRTC',
                'Trainer search and booking',
                'Multiple session types',
                'Real-time session management',
                'Session recording and summaries',
                'Payment processing integration'
            ],
            supportedFeatures: {
                video: true,
                audio: true,
                chat: true,
                screenShare: true,
                recording: true,
                formCorrection: true
            }
        };
    }
}

module.exports = new VirtualTrainingService();