const User = require('../models/User');

class VirtualDoctorService {
    constructor() {
        this.consultationHistory = new Map();
        this.symptomDatabase = this.initializeSymptomDatabase();
        this.medicalKnowledge = this.initializeMedicalKnowledge();
    }

    initializeSymptomDatabase() {
        return {
            'fever': {
                severity: 'moderate',
                commonCauses: ['viral infection', 'bacterial infection', 'inflammatory conditions'],
                recommendations: ['rest', 'hydration', 'monitor temperature', 'seek medical attention if persistent'],
                urgency: 'medium'
            },
            'headache': {
                severity: 'mild-moderate',
                commonCauses: ['tension', 'dehydration', 'stress', 'lack of sleep'],
                recommendations: ['rest in dark room', 'hydration', 'cold compress', 'stress management'],
                urgency: 'low'
            },
            'chest-pain': {
                severity: 'high',
                commonCauses: ['heart conditions', 'muscle strain', 'anxiety'],
                recommendations: ['seek immediate medical attention'],
                urgency: 'emergency'
            },
            'shortness-breath': {
                severity: 'high',
                commonCauses: ['respiratory conditions', 'heart problems', 'anxiety'],
                recommendations: ['seek medical attention', 'avoid exertion'],
                urgency: 'high'
            },
            'stomach-pain': {
                severity: 'mild-moderate',
                commonCauses: ['digestive issues', 'food poisoning', 'stress'],
                recommendations: ['bland diet', 'hydration', 'rest', 'monitor symptoms'],
                urgency: 'medium'
            },
            'fatigue': {
                severity: 'mild',
                commonCauses: ['poor sleep', 'stress', 'dehydration', 'underlying conditions'],
                recommendations: ['improve sleep hygiene', 'balanced diet', 'regular exercise', 'stress management'],
                urgency: 'low'
            }
        };
    }

    initializeMedicalKnowledge() {
        return {
            emergencySymptoms: [
                'chest pain', 'difficulty breathing', 'severe headache', 'loss of consciousness',
                'severe bleeding', 'signs of stroke', 'severe allergic reaction'
            ],
            preventiveCare: {
                exercise: 'Regular physical activity reduces risk of chronic diseases',
                nutrition: 'Balanced diet supports overall health and immune function',
                sleep: 'Quality sleep is essential for physical and mental health',
                stress: 'Chronic stress can lead to various health problems'
            },
            healthTips: [
                'Stay hydrated by drinking 8-10 glasses of water daily',
                'Aim for 7-9 hours of quality sleep each night',
                'Include fruits and vegetables in every meal',
                'Take regular breaks from screen time',
                'Practice stress-reduction techniques like meditation'
            ]
        };
    }

    async processConsultation(userId, message, userProfile = null) {
        try {
            // Get or create consultation history
            if (!this.consultationHistory.has(userId)) {
                this.consultationHistory.set(userId, []);
            }

            const history = this.consultationHistory.get(userId);
            history.push({ role: 'user', message, timestamp: new Date() });

            // Analyze the message
            const analysis = this.analyzeMessage(message, userProfile);
            const response = this.generateResponse(analysis, userProfile);

            // Store AI response
            history.push({ role: 'assistant', message: response, timestamp: new Date() });

            // Keep only last 20 messages to manage memory
            if (history.length > 20) {
                history.splice(0, history.length - 20);
            }

            return {
                success: true,
                response: response,
                analysis: analysis,
                urgency: analysis.urgency || 'low'
            };
        } catch (error) {
            console.error('Virtual doctor consultation error:', error);
            return {
                success: false,
                error: 'Unable to process consultation at this time',
                response: 'I apologize, but I\'m having trouble processing your request. Please try again or consult with a healthcare professional.'
            };
        }
    }

    analyzeMessage(message, userProfile) {
        const lowerMessage = message.toLowerCase();
        const analysis = {
            symptoms: [],
            concerns: [],
            urgency: 'low',
            category: 'general',
            keywords: []
        };

        // Extract symptoms
        Object.keys(this.symptomDatabase).forEach(symptom => {
            const symptomWords = symptom.split('-');
            if (symptomWords.some(word => lowerMessage.includes(word))) {
                analysis.symptoms.push(symptom);
                const symptomData = this.symptomDatabase[symptom];
                if (symptomData.urgency === 'emergency' || symptomData.urgency === 'high') {
                    analysis.urgency = 'high';
                } else if (symptomData.urgency === 'medium' && analysis.urgency === 'low') {
                    analysis.urgency = 'medium';
                }
            }
        });

        // Check for emergency keywords
        const emergencyKeywords = ['emergency', 'urgent', 'severe', 'can\'t breathe', 'chest pain', 'heart attack'];
        if (emergencyKeywords.some(keyword => lowerMessage.includes(keyword))) {
            analysis.urgency = 'emergency';
        }

        // Categorize the consultation
        if (lowerMessage.includes('nutrition') || lowerMessage.includes('diet') || lowerMessage.includes('food')) {
            analysis.category = 'nutrition';
        } else if (lowerMessage.includes('exercise') || lowerMessage.includes('workout') || lowerMessage.includes('fitness')) {
            analysis.category = 'fitness';
        } else if (lowerMessage.includes('sleep') || lowerMessage.includes('tired') || lowerMessage.includes('insomnia')) {
            analysis.category = 'sleep';
        } else if (lowerMessage.includes('stress') || lowerMessage.includes('anxiety') || lowerMessage.includes('mental')) {
            analysis.category = 'mental-health';
        }

        return analysis;
    }

    generateResponse(analysis, userProfile) {
        let response = '';

        // Handle emergency situations
        if (analysis.urgency === 'emergency') {
            return '🚨 **EMERGENCY ALERT** 🚨\n\nBased on your symptoms, this could be a medical emergency. Please:\n\n1. **Call emergency services immediately (911/108)**\n2. **Go to the nearest emergency room**\n3. **Do not delay seeking immediate medical attention**\n\nThis is not a substitute for emergency medical care. Please seek immediate professional help.';
        }

        // Handle high urgency
        if (analysis.urgency === 'high') {
            response += '⚠️ **Important:** Your symptoms suggest you should seek medical attention soon. Please consider contacting your healthcare provider or visiting an urgent care facility.\n\n';
        }

        // Address specific symptoms
        if (analysis.symptoms.length > 0) {
            response += '**Regarding your symptoms:**\n\n';
            analysis.symptoms.forEach(symptom => {
                const symptomData = this.symptomDatabase[symptom];
                response += `• **${symptom.replace('-', ' ').toUpperCase()}**: ${symptomData.commonCauses.join(', ')} are common causes.\n`;
                response += `  Recommendations: ${symptomData.recommendations.join(', ')}\n\n`;
            });
        }

        // Category-specific advice
        switch (analysis.category) {
            case 'nutrition':
                response += this.getNutritionAdvice(userProfile);
                break;
            case 'fitness':
                response += this.getFitnessAdvice(userProfile);
                break;
            case 'sleep':
                response += this.getSleepAdvice();
                break;
            case 'mental-health':
                response += this.getMentalHealthAdvice();
                break;
            default:
                response += this.getGeneralHealthAdvice();
        }

        // Add disclaimer
        response += '\n\n---\n*This information is for educational purposes only and should not replace professional medical advice. Please consult with a healthcare provider for proper diagnosis and treatment.*';

        return response;
    }

    getNutritionAdvice(userProfile) {
        const advice = [
            '**Nutrition Recommendations:**',
            '• Focus on whole, unprocessed foods',
            '• Include a variety of colorful fruits and vegetables',
            '• Stay adequately hydrated (8-10 glasses of water daily)',
            '• Consider portion control and mindful eating',
            '• Limit processed foods, added sugars, and excessive sodium'
        ];

        if (userProfile?.fitnessGoals?.primaryGoal === 'weight-loss') {
            advice.push('• Create a moderate caloric deficit through balanced nutrition');
            advice.push('• Focus on protein-rich foods to maintain muscle mass');
        } else if (userProfile?.fitnessGoals?.primaryGoal === 'muscle-gain') {
            advice.push('• Ensure adequate protein intake (1.6-2.2g per kg body weight)');
            advice.push('• Include complex carbohydrates for energy');
        }

        return advice.join('\n');
    }

    getFitnessAdvice(userProfile) {
        const advice = [
            '**Fitness Recommendations:**',
            '• Aim for at least 150 minutes of moderate aerobic activity weekly',
            '• Include strength training exercises 2-3 times per week',
            '• Start gradually and progressively increase intensity',
            '• Allow adequate rest and recovery between workouts',
            '• Listen to your body and avoid overexertion'
        ];

        const activityLevel = userProfile?.fitnessGoals?.activityLevel;
        if (activityLevel === 'sedentary') {
            advice.push('• Begin with light activities like walking or gentle stretching');
            advice.push('• Gradually increase activity duration and intensity');
        } else if (activityLevel === 'very-active') {
            advice.push('• Focus on proper form and technique');
            advice.push('• Consider periodization in your training program');
        }

        return advice.join('\n');
    }

    getSleepAdvice() {
        return [
            '**Sleep Hygiene Recommendations:**',
            '• Maintain a consistent sleep schedule (same bedtime and wake time)',
            '• Create a relaxing bedtime routine',
            '• Keep your bedroom cool, dark, and quiet',
            '• Avoid screens 1-2 hours before bedtime',
            '• Limit caffeine intake, especially in the afternoon',
            '• Consider relaxation techniques like meditation or deep breathing'
        ].join('\n');
    }

    getMentalHealthAdvice() {
        return [
            '**Mental Health Support:**',
            '• Practice stress management techniques (meditation, deep breathing)',
            '• Maintain social connections and seek support when needed',
            '• Engage in regular physical activity (natural mood booster)',
            '• Consider professional counseling if stress/anxiety persists',
            '• Prioritize self-care and activities you enjoy',
            '• Maintain a healthy work-life balance'
        ].join('\n');
    }

    getGeneralHealthAdvice() {
        const randomTips = this.medicalKnowledge.healthTips
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);

        return [
            '**General Health Tips:**',
            ...randomTips.map(tip => `• ${tip}`),
            '• Schedule regular check-ups with your healthcare provider',
            '• Stay up to date with recommended screenings and vaccinations'
        ].join('\n');
    }

    async analyzeSymptoms(userId, symptoms, additionalInfo = {}) {
        try {
            const analysis = {
                symptoms: symptoms,
                riskLevel: 'low',
                recommendations: [],
                urgentCare: false,
                possibleConditions: []
            };

            let highestUrgency = 'low';
            const allRecommendations = new Set();

            // Analyze each symptom
            symptoms.forEach(symptom => {
                if (this.symptomDatabase[symptom]) {
                    const symptomData = this.symptomDatabase[symptom];
                    
                    // Track highest urgency
                    if (symptomData.urgency === 'emergency') {
                        highestUrgency = 'emergency';
                        analysis.urgentCare = true;
                    } else if (symptomData.urgency === 'high' && highestUrgency !== 'emergency') {
                        highestUrgency = 'high';
                        analysis.urgentCare = true;
                    } else if (symptomData.urgency === 'medium' && highestUrgency === 'low') {
                        highestUrgency = 'medium';
                    }

                    // Collect recommendations
                    symptomData.recommendations.forEach(rec => allRecommendations.add(rec));
                    
                    // Add possible conditions
                    analysis.possibleConditions.push(...symptomData.commonCauses);
                }
            });

            analysis.riskLevel = highestUrgency;
            analysis.recommendations = Array.from(allRecommendations);

            // Generate comprehensive response
            let response = '**Symptom Analysis Results:**\n\n';
            
            if (analysis.urgentCare) {
                response += '⚠️ **IMPORTANT**: Based on your symptoms, we recommend seeking medical attention.\n\n';
            }

            response += `**Risk Level**: ${analysis.riskLevel.toUpperCase()}\n\n`;
            response += `**Selected Symptoms**: ${symptoms.join(', ')}\n\n`;
            
            if (analysis.possibleConditions.length > 0) {
                response += `**Possible Causes**: ${[...new Set(analysis.possibleConditions)].join(', ')}\n\n`;
            }

            response += '**Recommendations**:\n';
            analysis.recommendations.forEach(rec => {
                response += `• ${rec}\n`;
            });

            response += '\n**Next Steps**:\n';
            if (analysis.urgentCare) {
                response += '• Contact your healthcare provider or visit urgent care\n';
                response += '• Monitor symptoms closely\n';
            } else {
                response += '• Monitor your symptoms\n';
                response += '• Maintain healthy lifestyle habits\n';
                response += '• Consult healthcare provider if symptoms persist or worsen\n';
            }

            return {
                success: true,
                analysis: analysis,
                response: response
            };

        } catch (error) {
            console.error('Symptom analysis error:', error);
            return {
                success: false,
                error: 'Unable to analyze symptoms at this time'
            };
        }
    }

    async generateHealthAssessment(userId, assessmentData) {
        try {
            const assessment = {
                overallScore: 0,
                riskFactors: [],
                recommendations: [],
                strengths: [],
                areas_for_improvement: []
            };

            let score = 100; // Start with perfect score and deduct points

            // Analyze exercise habits
            const exerciseScore = this.analyzeExercise(assessmentData.exercise);
            score += exerciseScore.points;
            if (exerciseScore.isStrength) {
                assessment.strengths.push(exerciseScore.message);
            } else {
                assessment.areas_for_improvement.push(exerciseScore.message);
                assessment.recommendations.push(exerciseScore.recommendation);
            }

            // Analyze sleep quality
            const sleepScore = this.analyzeSleep(assessmentData.sleep);
            score += sleepScore.points;
            if (sleepScore.isStrength) {
                assessment.strengths.push(sleepScore.message);
            } else {
                assessment.areas_for_improvement.push(sleepScore.message);
                assessment.recommendations.push(sleepScore.recommendation);
            }

            // Analyze smoking status
            const smokingScore = this.analyzeSmoking(assessmentData.smoking);
            score += smokingScore.points;
            if (smokingScore.points < 0) {
                assessment.riskFactors.push(smokingScore.message);
                assessment.recommendations.push(smokingScore.recommendation);
            }

            // Analyze stress levels
            const stressScore = this.analyzeStress(parseInt(assessmentData.stress));
            score += stressScore.points;
            if (stressScore.points < 0) {
                assessment.areas_for_improvement.push(stressScore.message);
                assessment.recommendations.push(stressScore.recommendation);
            }

            // Analyze alcohol consumption
            const alcoholScore = this.analyzeAlcohol(assessmentData.alcohol);
            score += alcoholScore.points;
            if (alcoholScore.points < 0) {
                assessment.riskFactors.push(alcoholScore.message);
                assessment.recommendations.push(alcoholScore.recommendation);
            }

            assessment.overallScore = Math.max(0, Math.min(100, score));

            // Generate summary
            let summary = `**Health Assessment Summary**\n\n`;
            summary += `**Overall Health Score: ${assessment.overallScore}/100**\n\n`;

            if (assessment.overallScore >= 80) {
                summary += '🎉 **Excellent!** You\'re maintaining great health habits.\n\n';
            } else if (assessment.overallScore >= 60) {
                summary += '👍 **Good!** You have a solid foundation with room for improvement.\n\n';
            } else if (assessment.overallScore >= 40) {
                summary += '⚠️ **Fair** - Several areas could benefit from attention.\n\n';
            } else {
                summary += '🚨 **Needs Attention** - Consider making significant lifestyle changes.\n\n';
            }

            if (assessment.strengths.length > 0) {
                summary += '**Your Strengths:**\n';
                assessment.strengths.forEach(strength => summary += `• ${strength}\n`);
                summary += '\n';
            }

            if (assessment.areas_for_improvement.length > 0) {
                summary += '**Areas for Improvement:**\n';
                assessment.areas_for_improvement.forEach(area => summary += `• ${area}\n`);
                summary += '\n';
            }

            if (assessment.riskFactors.length > 0) {
                summary += '**Risk Factors to Address:**\n';
                assessment.riskFactors.forEach(risk => summary += `• ${risk}\n`);
                summary += '\n';
            }

            summary += '**Personalized Recommendations:**\n';
            assessment.recommendations.forEach(rec => summary += `• ${rec}\n`);

            return {
                success: true,
                assessment: assessment,
                summary: summary
            };

        } catch (error) {
            console.error('Health assessment error:', error);
            return {
                success: false,
                error: 'Unable to generate health assessment'
            };
        }
    }

    analyzeExercise(exercise) {
        switch (exercise) {
            case 'daily':
                return { points: 10, isStrength: true, message: 'Excellent daily exercise routine', recommendation: 'Keep up the great work!' };
            case 'regularly':
                return { points: 5, isStrength: true, message: 'Good regular exercise habits', recommendation: 'Consider adding one more day per week' };
            case 'sometimes':
                return { points: -5, isStrength: false, message: 'Inconsistent exercise routine', recommendation: 'Aim for at least 3-4 days per week of physical activity' };
            case 'rarely':
                return { points: -15, isStrength: false, message: 'Very limited physical activity', recommendation: 'Start with 20-30 minutes of walking daily' };
            case 'never':
                return { points: -25, isStrength: false, message: 'No regular physical activity', recommendation: 'Begin with light activities like walking or stretching' };
            default:
                return { points: 0, isStrength: false, message: 'Exercise habits unclear', recommendation: 'Aim for 150 minutes of moderate activity weekly' };
        }
    }

    analyzeSleep(sleep) {
        switch (sleep) {
            case 'excellent':
                return { points: 10, isStrength: true, message: 'Excellent sleep quality', recommendation: 'Maintain your healthy sleep routine' };
            case 'good':
                return { points: 5, isStrength: true, message: 'Good sleep habits', recommendation: 'Continue prioritizing quality sleep' };
            case 'fair':
                return { points: -5, isStrength: false, message: 'Suboptimal sleep quality', recommendation: 'Focus on sleep hygiene and aim for 7-9 hours nightly' };
            case 'poor':
                return { points: -15, isStrength: false, message: 'Poor sleep quality', recommendation: 'Prioritize sleep improvement - consider consulting a sleep specialist' };
            default:
                return { points: 0, isStrength: false, message: 'Sleep quality unclear', recommendation: 'Aim for 7-9 hours of quality sleep nightly' };
        }
    }

    analyzeSmoking(smoking) {
        switch (smoking) {
            case 'never':
                return { points: 0, message: 'Non-smoker', recommendation: 'Continue avoiding tobacco products' };
            case 'former':
                return { points: -5, message: 'Former smoker', recommendation: 'Great job quitting! Continue to avoid tobacco' };
            case 'occasional':
                return { points: -15, message: 'Occasional tobacco use', recommendation: 'Consider complete cessation for optimal health' };
            case 'regular':
                return { points: -25, message: 'Regular tobacco use', recommendation: 'Strongly consider smoking cessation programs and support' };
            default:
                return { points: 0, message: 'Smoking status unclear', recommendation: 'Avoid tobacco products for better health' };
        }
    }

    analyzeStress(stressLevel) {
        if (stressLevel <= 3) {
            return { points: 5, message: 'Low stress levels', recommendation: 'Continue your effective stress management' };
        } else if (stressLevel <= 5) {
            return { points: 0, message: 'Moderate stress levels', recommendation: 'Consider stress reduction techniques' };
        } else if (stressLevel <= 7) {
            return { points: -10, message: 'Elevated stress levels', recommendation: 'Implement regular stress management practices' };
        } else {
            return { points: -20, message: 'High stress levels', recommendation: 'Consider professional stress management support' };
        }
    }

    analyzeAlcohol(alcohol) {
        switch (alcohol) {
            case 'never':
                return { points: 5, message: 'No alcohol consumption', recommendation: 'Continue avoiding alcohol' };
            case 'rarely':
                return { points: 0, message: 'Minimal alcohol use', recommendation: 'Maintain moderate consumption if any' };
            case 'moderate':
                return { points: -5, message: 'Moderate alcohol consumption', recommendation: 'Monitor intake and consider reducing if needed' };
            case 'regular':
                return { points: -15, message: 'Regular alcohol consumption', recommendation: 'Consider reducing alcohol intake for better health' };
            case 'heavy':
                return { points: -25, message: 'Heavy alcohol consumption', recommendation: 'Strongly consider reducing alcohol intake or seeking support' };
            default:
                return { points: 0, message: 'Alcohol consumption unclear', recommendation: 'Limit alcohol intake for optimal health' };
        }
    }

    getConsultationHistory(userId) {
        return this.consultationHistory.get(userId) || [];
    }

    clearConsultationHistory(userId) {
        this.consultationHistory.delete(userId);
    }
}

module.exports = new VirtualDoctorService();