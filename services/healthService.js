const axios = require('axios');

class HealthService {
  constructor() {
    // Mock health facilities database - in production, this would be a real database
    this.healthFacilities = [
      {
        id: 'lab_001',
        name: 'LifeCare Diagnostics',
        type: 'laboratory',
        address: '123 Health Street, Medical District',
        phone: '+1-555-0123',
        rating: 4.5,
        services: ['blood-test', 'health-package', 'basic-checkup'],
        coordinates: { lat: 40.7128, lng: -74.0060 },
        distance: 0.5,
        bookingUrl: 'https://lifecare.com/book',
        acceptsInsurance: true,
        operatingHours: {
          monday: '8:00 AM - 6:00 PM',
          tuesday: '8:00 AM - 6:00 PM',
          wednesday: '8:00 AM - 6:00 PM',
          thursday: '8:00 AM - 6:00 PM',
          friday: '8:00 AM - 6:00 PM',
          saturday: '9:00 AM - 4:00 PM',
          sunday: 'Closed'
        }
      },
      {
        id: 'hosp_001',
        name: 'Metro General Hospital',
        type: 'hospital',
        address: '456 Medical Avenue, Downtown',
        phone: '+1-555-0456',
        rating: 4.2,
        services: ['health-package', 'comprehensive-checkup', 'specialist-consultation'],
        coordinates: { lat: 40.7589, lng: -73.9851 },
        distance: 1.2,
        bookingUrl: 'https://metrogeneral.com/appointments',
        acceptsInsurance: true,
        operatingHours: {
          monday: '24/7',
          tuesday: '24/7',
          wednesday: '24/7',
          thursday: '24/7',
          friday: '24/7',
          saturday: '24/7',
          sunday: '24/7'
        }
      },
      {
        id: 'lab_002',
        name: 'QuickTest Labs',
        type: 'laboratory',
        address: '789 Wellness Road, Health Plaza',
        phone: '+1-555-0789',
        rating: 4.3,
        services: ['blood-test', 'basic-checkup', 'rapid-testing'],
        coordinates: { lat: 40.7505, lng: -73.9934 },
        distance: 0.8,
        bookingUrl: 'https://quicktestlabs.com/schedule',
        acceptsInsurance: false,
        operatingHours: {
          monday: '7:00 AM - 7:00 PM',
          tuesday: '7:00 AM - 7:00 PM',
          wednesday: '7:00 AM - 7:00 PM',
          thursday: '7:00 AM - 7:00 PM',
          friday: '7:00 AM - 7:00 PM',
          saturday: '8:00 AM - 5:00 PM',
          sunday: '10:00 AM - 3:00 PM'
        }
      },
      {
        id: 'clinic_001',
        name: 'Wellness Center Plus',
        type: 'clinic',
        address: '321 Care Boulevard, Medical Center',
        phone: '+1-555-0321',
        rating: 4.7,
        services: ['health-package', 'preventive-care', 'wellness-screening'],
        coordinates: { lat: 40.7282, lng: -73.7949 },
        distance: 2.1,
        bookingUrl: 'https://wellnesscenterplus.com/book-appointment',
        acceptsInsurance: true,
        operatingHours: {
          monday: '8:00 AM - 5:00 PM',
          tuesday: '8:00 AM - 5:00 PM',
          wednesday: '8:00 AM - 5:00 PM',
          thursday: '8:00 AM - 5:00 PM',
          friday: '8:00 AM - 5:00 PM',
          saturday: '9:00 AM - 2:00 PM',
          sunday: 'Closed'
        }
      },
      {
        id: 'lab_003',
        name: 'HealthFirst Laboratory',
        type: 'laboratory',
        address: '555 Medical Plaza, Health District',
        phone: '+1-555-0555',
        rating: 4.6,
        services: ['blood-test', 'lab-work', 'rapid-testing', 'health-package'],
        coordinates: { lat: 40.7614, lng: -73.9776 },
        distance: 1.5,
        bookingUrl: 'https://healthfirstlab.com/appointments',
        acceptsInsurance: true,
        operatingHours: {
          monday: '6:00 AM - 8:00 PM',
          tuesday: '6:00 AM - 8:00 PM',
          wednesday: '6:00 AM - 8:00 PM',
          thursday: '6:00 AM - 8:00 PM',
          friday: '6:00 AM - 8:00 PM',
          saturday: '7:00 AM - 6:00 PM',
          sunday: '8:00 AM - 4:00 PM'
        }
      },
      {
        id: 'clinic_002',
        name: 'Prime Health Clinic',
        type: 'clinic',
        address: '888 Wellness Avenue, Medical Center',
        phone: '+1-555-0888',
        rating: 4.4,
        services: ['consultation', 'preventive-care', 'basic-checkup', 'wellness-screening'],
        coordinates: { lat: 40.7831, lng: -73.9712 },
        distance: 2.3,
        bookingUrl: 'https://primehealthclinic.com/book',
        acceptsInsurance: true,
        operatingHours: {
          monday: '7:00 AM - 6:00 PM',
          tuesday: '7:00 AM - 6:00 PM',
          wednesday: '7:00 AM - 6:00 PM',
          thursday: '7:00 AM - 6:00 PM',
          friday: '7:00 AM - 6:00 PM',
          saturday: '8:00 AM - 3:00 PM',
          sunday: 'Closed'
        }
      },
      {
        id: 'hosp_002',
        name: 'Central Medical Hospital',
        type: 'hospital',
        address: '999 Healthcare Boulevard, Medical District',
        phone: '+1-555-0999',
        rating: 4.8,
        services: ['comprehensive-checkup', 'health-package', 'consultation', 'monitoring', 'all-services'],
        coordinates: { lat: 40.7484, lng: -73.9857 },
        distance: 0.9,
        bookingUrl: 'https://centralmedical.com/schedule',
        acceptsInsurance: true,
        operatingHours: {
          monday: '24/7',
          tuesday: '24/7',
          wednesday: '24/7',
          thursday: '24/7',
          friday: '24/7',
          saturday: '24/7',
          sunday: '24/7'
        }
      }
    ];

    // Health reward service mappings
    this.rewardServiceMap = {
      'health-coupon': ['basic-checkup', 'preventive-care', 'consultation'],
      'blood-test': ['blood-test', 'rapid-testing', 'lab-work'],
      'health-package': ['health-package', 'comprehensive-checkup', 'wellness-screening'],
      'wellness-consultation': ['consultation', 'wellness-screening', 'preventive-care'],
      'health-monitoring': ['health-package', 'comprehensive-checkup', 'monitoring'],
      'health-champion': ['all-services'] // Champion status gets access to all services
    };

    // Reward discount mappings
    this.rewardDiscounts = {
      'health-coupon': { type: 'percentage', value: 15 },
      'blood-test': { type: 'free', value: 100 },
      'health-package': { type: 'free', value: 100 },
      'wellness-consultation': { type: 'free', value: 100 },
      'health-monitoring': { type: 'percentage', value: 50 },
      'health-champion': { type: 'percentage', value: 25 } // 25% off everything for life
    };
  }

  // Find nearby health facilities based on user location
  async findNearbyFacilities(userLocation, rewardType = null, maxDistance = 10) {
    try {
      let facilities = [...this.healthFacilities];

      // Filter by reward type if specified
      if (rewardType && this.rewardServiceMap[rewardType]) {
        const requiredServices = this.rewardServiceMap[rewardType];
        
        // Special handling for health-champion (access to all services)
        if (rewardType === 'health-champion') {
          // Health champions get access to all facilities
        } else {
          facilities = facilities.filter(facility => 
            facility.services.some(service => requiredServices.includes(service))
          );
        }
      }

      
      facilities = facilities.filter(facility => facility.distance <= maxDistance);

  
      facilities = facilities.map(facility => ({
        ...facility,
        rewardCompatible: rewardType ? this.isRewardCompatible(facility, rewardType) : true,
        estimatedSavings: rewardType ? this.calculateSavings(rewardType) : null,
        availableToday: this.isOpenToday(facility)
      }));

    
      facilities.sort((a, b) => {
  
        if (a.rewardCompatible && !b.rewardCompatible) return -1;
        if (!a.rewardCompatible && b.rewardCompatible) return 1;

        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        
   
        return b.rating - a.rating;
      });

      return facilities;
    } catch (error) {
      console.error('Error finding nearby facilities:', error);
      throw error;
    }
  }

  // Check if facility is compatible with reward type
  isRewardCompatible(facility, rewardType) {
    if (!rewardType || !this.rewardServiceMap[rewardType]) return false;
    
    const requiredServices = this.rewardServiceMap[rewardType];
    
    // Health champion gets access to all services
    if (rewardType === 'health-champion') return true;
    
    return facility.services.some(service => requiredServices.includes(service));
  }


  calculateSavings(rewardType) {
    const discount = this.rewardDiscounts[rewardType];
    if (!discount) return null;

    if (discount.type === 'free') {
      return { type: 'free', description: 'FREE Service' };
    } else if (discount.type === 'percentage') {
      return { 
        type: 'percentage', 
        value: discount.value,
        description: `${discount.value}% OFF` 
      };
    }

    return null;
  }

  // Check if facility is open today (simplified)
  isOpenToday(facility) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
    const todayHours = facility.operatingHours[today];
    return todayHours && todayHours !== 'Closed' && todayHours !== '24/7';
  }

  // Get facility details by ID
  getFacilityById(facilityId) {
    return this.healthFacilities.find(facility => facility.id === facilityId);
  }

  // Generate booking link with reward information
  generateBookingLink(facilityId, rewardId, userId) {
    const facility = this.getFacilityById(facilityId);
    if (!facility) {
      throw new Error('Facility not found');
    }

    // In a real implementation, this would integrate with the facility's booking system
    const bookingParams = new URLSearchParams({
      reward_id: rewardId,
      user_id: userId,
      source: 'fit-with-ai',
      utm_campaign: 'health_rewards'
    });

    return `${facility.bookingUrl}?${bookingParams.toString()}`;
  }

  // Get available time slots for a facility (mock implementation)
  async getAvailableSlots(facilityId, date) {
    try {
      const facility = this.getFacilityById(facilityId);
      if (!facility) {
        throw new Error('Facility not found');
      }

      // Mock available slots - in production, this would query the facility's system
      const slots = [
        { time: '09:00 AM', available: true },
        { time: '10:00 AM', available: true },
        { time: '11:00 AM', available: false },
        { time: '02:00 PM', available: true },
        { time: '03:00 PM', available: true },
        { time: '04:00 PM', available: true }
      ];

      return slots.filter(slot => slot.available);
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw error;
    }
  }

  // Book appointment (mock implementation)
  async bookAppointment(facilityId, rewardId, userId, appointmentData) {
    try {
      const facility = this.getFacilityById(facilityId);
      if (!facility) {
        throw new Error('Facility not found');
      }

      // Mock booking confirmation
      const bookingConfirmation = {
        bookingId: `BK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        facilityId,
        facilityName: facility.name,
        facilityAddress: facility.address,
        facilityPhone: facility.phone,
        appointmentDate: appointmentData.date,
        appointmentTime: appointmentData.time,
        serviceType: appointmentData.serviceType,
        rewardId,
        userId,
        status: 'confirmed',
        confirmationCode: Math.random().toString(36).substr(2, 8).toUpperCase(),
        bookedAt: new Date(),
        instructions: 'Please arrive 15 minutes early. Bring a valid ID and insurance card if applicable.'
      };

      return bookingConfirmation;
    } catch (error) {
      console.error('Error booking appointment:', error);
      throw error;
    }
  }

  // Get user's booking history
  async getUserBookings(userId) {
    // In production, this would query a bookings database
    // For now, return mock data
    return [
      {
        bookingId: 'BK1234567890',
        facilityName: 'LifeCare Diagnostics',
        serviceType: 'Blood Test',
        appointmentDate: '2024-01-15',
        appointmentTime: '10:00 AM',
        status: 'completed',
        rewardUsed: '5-Day Streak Blood Test Voucher'
      }
    ];
  }

  // Process streak-based health rewards
  async processStreakReward(userId, streakType, streakCount, userInfo) {
    try {
      console.log(`Processing streak reward for user ${userId}: ${streakType} streak of ${streakCount} days`);
      
      // Define streak milestones and their rewards
      const streakMilestones = {
        workout: {
          5: { type: 'health-coupon', name: '15% Health Checkup Discount' },
          7: { type: 'blood-test', name: 'Free Blood Test' },
          14: { type: 'wellness-consultation', name: 'Free Wellness Consultation' },
          21: { type: 'health-package', name: 'Free Health Screening Package' },
          30: { type: 'health-monitoring', name: '50% Off Health Monitoring' },
          60: { type: 'health-champion', name: 'Health Champion Status - 25% Lifetime Discount' }
        },
        nutrition: {
          7: { type: 'health-coupon', name: '15% Nutrition Consultation Discount' },
          14: { type: 'blood-test', name: 'Free Nutritional Blood Panel' },
          21: { type: 'wellness-consultation', name: 'Free Nutritionist Consultation' },
          30: { type: 'health-package', name: 'Free Comprehensive Health Package' },
          45: { type: 'health-monitoring', name: '50% Off Premium Health Monitoring' },
          90: { type: 'health-champion', name: 'Nutrition Champion Status - 25% Lifetime Discount' }
        }
      };

      const milestones = streakMilestones[streakType];
      if (!milestones || !milestones[streakCount]) {
        return null; // No reward for this streak count
      }

      const rewardInfo = milestones[streakCount];
      
      // Generate reward
      const reward = {
        id: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'health',
        subType: rewardInfo.type,
        name: rewardInfo.name,
        description: `Earned for maintaining a ${streakCount}-day ${streakType} streak`,
        value: this.getRewardValue(rewardInfo.type),
        earnedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        used: false,
        streakType: streakType,
        streakCount: streakCount
      };

      // Find nearby hospitals and send notifications
      await this.notifyNearbyHospitals(userInfo, reward);

      return reward;
    } catch (error) {
      console.error('Error processing streak reward:', error);
      throw error;
    }
  }

  // Get reward value for different types
  getRewardValue(rewardType) {
    const values = {
      'health-coupon': 15, // 15% discount
      'blood-test': 100, // $100 value
      'health-package': 250, // $250 value
      'wellness-consultation': 120, // $120 value
      'health-monitoring': 50, // 50% discount
      'health-champion': 25 // 25% lifetime discount
    };
    return values[rewardType] || 0;
  }

  // Notify nearby hospitals about user's reward
  async notifyNearbyHospitals(userInfo, reward) {
    try {
      console.log(`Notifying hospitals about reward for user: ${userInfo.email}`);
      
      // Find nearby facilities that support this reward type
      const compatibleFacilities = this.healthFacilities.filter(facility => 
        this.isRewardCompatible(facility, reward.subType) && facility.distance <= 5 // Within 5km
      );

      if (compatibleFacilities.length === 0) {
        console.log('No compatible facilities found nearby');
        return;
      }

      // Prepare email data
      const emailData = {
        user: {
          name: userInfo.fullName || userInfo.firstName || 'Valued Customer',
          email: userInfo.email,
          streakType: reward.streakType,
          streakCount: reward.streakCount
        },
        reward: {
          name: reward.name,
          type: reward.subType,
          value: reward.value,
          description: reward.description,
          expiresAt: reward.expiresAt
        },
        facilities: compatibleFacilities.slice(0, 3) // Top 3 nearest facilities
      };

      // Send emails to hospitals (mock implementation)
      for (const facility of emailData.facilities) {
        await this.sendHospitalNotification(facility, emailData);
      }

      console.log(`Sent notifications to ${emailData.facilities.length} healthcare facilities`);
      
    } catch (error) {
      console.error('Error notifying hospitals:', error);
      // Don't throw error as this is a background process
    }
  }

  // Send notification email to hospital
  async sendHospitalNotification(facility, emailData) {
    try {
      // In a real implementation, this would send actual emails
      // For now, we'll log the email content
      
      const emailContent = {
        to: this.getHospitalEmail(facility),
        subject: `New Health Reward Customer - ${emailData.reward.name}`,
        body: `
Dear ${facility.name} Team,

We're excited to inform you about a new customer who has earned a health reward through our Fit-With-AI platform!

Customer Details:
- Name: ${emailData.user.name}
- Email: ${emailData.user.email}
- Achievement: ${emailData.user.streakCount}-day ${emailData.user.streakType} streak

Reward Details:
- Reward: ${emailData.reward.name}
- Type: ${emailData.reward.type}
- Value: ${emailData.reward.value}
- Valid Until: ${new Date(emailData.reward.expiresAt).toLocaleDateString()}

This customer has demonstrated exceptional commitment to their health and fitness journey. They may contact you to redeem their reward for services at your facility.

Please provide them with excellent service and honor the reward terms. This partnership helps promote healthy lifestyles in our community.

Best regards,
Fit-With-AI Health Rewards Team

---
This is an automated notification. Please do not reply to this email.
        `
      };

      console.log(`Hospital Email Notification:`, {
        facility: facility.name,
        email: emailContent.to,
        subject: emailContent.subject,
        customerName: emailData.user.name,
        rewardType: emailData.reward.name
      });

      // In production, integrate with email service
      // await emailService.sendEmail(emailContent);
      
      return true;
    } catch (error) {
      console.error(`Error sending notification to ${facility.name}:`, error);
      return false;
    }
  }

  // Get hospital email (mock implementation)
  getHospitalEmail(facility) {
    // In production, this would come from the facility database
    const emailMap = {
      'lab_001': 'appointments@lifecare-diagnostics.com',
      'hosp_001': 'partnerships@metrogeneral.com',
      'lab_002': 'rewards@quicktestlabs.com',
      'clinic_001': 'wellness@wellnesscenterplus.com',
      'lab_003': 'partnerships@healthfirstlab.com',
      'clinic_002': 'admin@primehealthclinic.com',
      'hosp_002': 'rewards@centralmedical.com'
    };
    
    return emailMap[facility.id] || `partnerships@${facility.name.toLowerCase().replace(/\s+/g, '')}.com`;
  }

  // Get upcoming streak milestones for motivation
  getUpcomingStreakMilestones(currentStreak, streakType) {
    const milestones = {
      workout: [5, 7, 14, 21, 30, 60],
      nutrition: [7, 14, 21, 30, 45, 90]
    };

    const typeMilestones = milestones[streakType] || [];
    const upcoming = typeMilestones.filter(milestone => milestone > currentStreak);
    
    return upcoming.slice(0, 3).map(milestone => {
      const rewardInfo = this.getStreakRewardInfo(streakType, milestone);
      return {
        streakCount: milestone,
        daysToGo: milestone - currentStreak,
        reward: rewardInfo
      };
    });
  }

  // Get streak reward information
  getStreakRewardInfo(streakType, streakCount) {
    const rewards = {
      workout: {
        5: { type: 'health-coupon', name: '15% Health Checkup Discount', value: 15 },
        7: { type: 'blood-test', name: 'Free Blood Test', value: 100 },
        14: { type: 'wellness-consultation', name: 'Free Wellness Consultation', value: 120 },
        21: { type: 'health-package', name: 'Free Health Screening Package', value: 250 },
        30: { type: 'health-monitoring', name: '50% Off Health Monitoring', value: 50 },
        60: { type: 'health-champion', name: 'Health Champion Status', value: 25 }
      },
      nutrition: {
        7: { type: 'health-coupon', name: '15% Nutrition Consultation Discount', value: 15 },
        14: { type: 'blood-test', name: 'Free Nutritional Blood Panel', value: 100 },
        21: { type: 'wellness-consultation', name: 'Free Nutritionist Consultation', value: 120 },
        30: { type: 'health-package', name: 'Free Comprehensive Health Package', value: 250 },
        45: { type: 'health-monitoring', name: '50% Off Premium Health Monitoring', value: 50 },
        90: { type: 'health-champion', name: 'Nutrition Champion Status', value: 25 }
      }
    };

    return rewards[streakType]?.[streakCount] || null;
  }

  // Check if user qualifies for streak reward
  shouldAwardStreakReward(streakType, currentStreak, previousStreak) {
    const milestones = {
      workout: [5, 7, 14, 21, 30, 60],
      nutrition: [7, 14, 21, 30, 45, 90]
    };

    const typeMilestones = milestones[streakType] || [];
    
    // Check if current streak hits a milestone that previous streak didn't
    return typeMilestones.some(milestone => 
      currentStreak >= milestone && previousStreak < milestone
    );
  }

  // Get streak statistics for dashboard
  getStreakStats(userStreaks) {
    const stats = {
      workout: {
        current: userStreaks.workout?.current || 0,
        longest: userStreaks.workout?.longest || 0,
        nextMilestone: null,
        daysToNext: null
      },
      nutrition: {
        current: userStreaks.nutrition?.current || 0,
        longest: userStreaks.nutrition?.longest || 0,
        nextMilestone: null,
        daysToNext: null
      }
    };

    // Calculate next milestones
    ['workout', 'nutrition'].forEach(type => {
      const upcoming = this.getUpcomingStreakMilestones(stats[type].current, type);
      if (upcoming.length > 0) {
        stats[type].nextMilestone = upcoming[0].reward;
        stats[type].daysToNext = upcoming[0].daysToGo;
      }
    });

    return stats;
  }

  // Validate reward for booking
  validateRewardForBooking(reward, serviceType) {
    if (!reward || reward.used || new Date() > new Date(reward.expiresAt)) {
      return { valid: false, reason: 'Reward is expired or already used' };
    }

    const allowedServices = this.rewardServiceMap[reward.subType] || [];
    if (!allowedServices.includes(serviceType)) {
      return { 
        valid: false, 
        reason: `This reward is not valid for ${serviceType}. Valid for: ${allowedServices.join(', ')}` 
      };
    }

    return { valid: true };
  }

  
  getRewardBenefit(rewardType) {
    const benefits = {
      'health-coupon': {
        type: 'discount',
        value: 15,
        unit: 'percent',
        description: '15% discount on health checkups and consultations',
        estimatedValue: '$30-50 savings'
      },
      'blood-test': {
        type: 'free_service',
        value: 100,
        unit: 'percent',
        description: 'Free basic blood test at participating labs',
        estimatedValue: '$80-120 value'
      },
      'health-package': {
        type: 'free_service',
        value: 100,
        unit: 'percent',
        description: 'Free comprehensive health screening package',
        estimatedValue: '$200-300 value'
      },
      'wellness-consultation': {
        type: 'free_service',
        value: 100,
        unit: 'percent',
        description: 'Free 30-minute consultation with wellness expert',
        estimatedValue: '$100-150 value'
      },
      'health-monitoring': {
        type: 'discount',
        value: 50,
        unit: 'percent',
        description: '50% off premium health monitoring tools',
        estimatedValue: '$50-100 savings'
      },
      'health-champion': {
        type: 'lifetime_discount',
        value: 25,
        unit: 'percent',
        description: '25% lifetime discount on all health services',
        estimatedValue: 'Unlimited savings'
      }
    };

    return benefits[rewardType] || null;
  }

  // Search facilities by name or service
  searchFacilities(query, userLocation = null) {
    const searchTerm = query.toLowerCase();
    
    let results = this.healthFacilities.filter(facility => 
      facility.name.toLowerCase().includes(searchTerm) ||
      facility.services.some(service => service.toLowerCase().includes(searchTerm)) ||
      facility.type.toLowerCase().includes(searchTerm)
    );

    // Sort by relevance and distance if location provided
    results.sort((a, b) => {
      // Prioritize exact name matches
      const aNameMatch = a.name.toLowerCase().includes(searchTerm);
      const bNameMatch = b.name.toLowerCase().includes(searchTerm);
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      // Then sort by distance if available
      if (userLocation) {
        return a.distance - b.distance;
      }
      
      // Finally by rating
      return b.rating - a.rating;
    });

    return results;
  }
}

module.exports = new HealthService();