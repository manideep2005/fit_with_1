/**
 * Progress Prediction Service
 * Uses BigQuery ML and AI to predict user fitness progress and outcomes
 */

// Google Cloud BigQuery removed for deployment simplicity
const ENABLE_BQ = process.env.ENABLE_BQ_PROVISIONING === 'true';

class ProgressPredictionService {
    constructor() {
        this.bigquery = null;
        this.datasetId = process.env.BIGQUERY_DATASET_ID || 'fitness_analytics';
        this.modelsCache = new Map();
        this.predictionCache = new Map();
        this.initializeBigQuery();
    }

    async initializeBigQuery() {
        try {
            if (!process.env.BIGQUERY_PROJECT_ID) {
                console.log('ℹ️ BigQuery disabled - BIGQUERY_PROJECT_ID not set');
                return;
            }

            this.bigquery = new BigQuery({
                projectId: process.env.BIGQUERY_PROJECT_ID,
                keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
            });
            console.log('✅ BigQuery client created');
            
            // Only set up datasets/models when explicitly enabled
            if (ENABLE_BQ) {
                console.log('⚙️  BigQuery provisioning enabled - setting up datasets/models');
                await this.setupMLModels();
            } else {
                console.log('ℹ️ BigQuery provisioning disabled (set ENABLE_BQ_PROVISIONING=true to enable).');
            }
        } catch (error) {
            console.error('❌ BigQuery init failed:', error.message);
            this.bigquery = null;
        }
    }

    async setupMLModels() {
        try {
            // Create dataset if it doesn't exist
            const [datasets] = await this.bigquery.getDatasets();
            const datasetExists = datasets.some(dataset => dataset.id === this.datasetId);
            
            if (!datasetExists) {
                await this.bigquery.createDataset(this.datasetId);
                console.log(`✅ Created BigQuery dataset: ${this.datasetId}`);
            }

            // Setup ML models for different predictions
            await this.createPredictionModels();

        } catch (error) {
            console.error('Setup ML models error:', error);
        }
    }

    async createPredictionModels() {
        const models = [
            {
                name: 'weight_loss_predictor',
                type: 'LINEAR_REG',
                features: ['age', 'gender', 'starting_weight', 'height', 'activity_level', 'calorie_deficit', 'workout_frequency'],
                target: 'weight_change_per_week'
            },
            {
                name: 'workout_performance_predictor',
                type: 'LINEAR_REG',
                features: ['current_strength', 'workout_frequency', 'rest_days', 'nutrition_score', 'sleep_hours'],
                target: 'performance_improvement'
            },
            {
                name: 'goal_achievement_predictor',
                type: 'LOGISTIC_REG',
                features: ['goal_type', 'timeline_weeks', 'current_progress', 'consistency_score', 'motivation_level'],
                target: 'will_achieve_goal'
            },
            {
                name: 'injury_risk_predictor',
                type: 'LOGISTIC_REG',
                features: ['workout_intensity', 'recovery_time', 'form_score', 'previous_injuries', 'age'],
                target: 'injury_risk_level'
            }
        ];

        for (const model of models) {
            try {
                await this.createMLModel(model);
            } catch (error) {
                console.error(`Failed to create model ${model.name}:`, error.message);
            }
        }
    }

    async createMLModel(modelConfig) {
        const query = `
            CREATE OR REPLACE MODEL \`${process.env.BIGQUERY_PROJECT_ID}.${this.datasetId}.${modelConfig.name}\`
            OPTIONS(
                model_type='${modelConfig.type}',
                input_label_cols=['${modelConfig.target}']
            ) AS
            SELECT * FROM \`${process.env.BIGQUERY_PROJECT_ID}.${this.datasetId}.training_data\`
            WHERE model_type = '${modelConfig.name}'
        `;

        try {
            await this.bigquery.query(query);
            console.log(`✅ Created ML model: ${modelConfig.name}`);
        } catch (error) {
            // Model creation might fail if no training data exists yet
            console.log(`⚠️ Model ${modelConfig.name} creation deferred (no training data)`);
        }
    }

    async predictWeightLoss(userId, userProfile, goalData) {
        try {
            const cacheKey = `weight_loss_${userId}_${JSON.stringify(goalData)}`;
            const cached = this.predictionCache.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
                return cached.prediction;
            }

            let prediction;
            
            if (this.bigquery) {
                prediction = await this.predictWithBigQueryML('weight_loss_predictor', userProfile, goalData);
            } else {
                prediction = this.predictWeightLossLocally(userProfile, goalData);
            }

            // Cache the prediction
            this.predictionCache.set(cacheKey, {
                prediction: prediction,
                timestamp: Date.now()
            });

            return prediction;

        } catch (error) {
            console.error('Weight loss prediction error:', error);
            return this.predictWeightLossLocally(userProfile, goalData);
        }
    }

    async predictWorkoutPerformance(userId, userProfile, workoutHistory) {
        try {
            const cacheKey = `performance_${userId}_${workoutHistory.length}`;
            const cached = this.predictionCache.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < 12 * 60 * 60 * 1000) {
                return cached.prediction;
            }

            let prediction;
            
            if (this.bigquery) {
                prediction = await this.predictWithBigQueryML('workout_performance_predictor', userProfile, workoutHistory);
            } else {
                prediction = this.predictPerformanceLocally(userProfile, workoutHistory);
            }

            this.predictionCache.set(cacheKey, {
                prediction: prediction,
                timestamp: Date.now()
            });

            return prediction;

        } catch (error) {
            console.error('Performance prediction error:', error);
            return this.predictPerformanceLocally(userProfile, workoutHistory);
        }
    }

    async predictGoalAchievement(userId, goalData, progressHistory) {
        try {
            const cacheKey = `goal_${userId}_${goalData.id}`;
            const cached = this.predictionCache.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < 6 * 60 * 60 * 1000) {
                return cached.prediction;
            }

            let prediction;
            
            if (this.bigquery) {
                prediction = await this.predictWithBigQueryML('goal_achievement_predictor', goalData, progressHistory);
            } else {
                prediction = this.predictGoalAchievementLocally(goalData, progressHistory);
            }

            this.predictionCache.set(cacheKey, {
                prediction: prediction,
                timestamp: Date.now()
            });

            return prediction;

        } catch (error) {
            console.error('Goal achievement prediction error:', error);
            return this.predictGoalAchievementLocally(goalData, progressHistory);
        }
    }

    async predictInjuryRisk(userId, userProfile, workoutData) {
        try {
            const cacheKey = `injury_${userId}_${Date.now().toString().slice(0, -5)}`;
            const cached = this.predictionCache.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < 2 * 60 * 60 * 1000) {
                return cached.prediction;
            }

            let prediction;
            
            if (this.bigquery) {
                prediction = await this.predictWithBigQueryML('injury_risk_predictor', userProfile, workoutData);
            } else {
                prediction = this.predictInjuryRiskLocally(userProfile, workoutData);
            }

            this.predictionCache.set(cacheKey, {
                prediction: prediction,
                timestamp: Date.now()
            });

            return prediction;

        } catch (error) {
            console.error('Injury risk prediction error:', error);
            return this.predictInjuryRiskLocally(userProfile, workoutData);
        }
    }

    async predictWithBigQueryML(modelName, ...inputData) {
        try {
            const features = this.prepareMLFeatures(modelName, ...inputData);
            
            const query = `
                SELECT *
                FROM ML.PREDICT(
                    MODEL \`${process.env.BIGQUERY_PROJECT_ID}.${this.datasetId}.${modelName}\`,
                    (SELECT ${Object.keys(features).map(key => `${features[key]} as ${key}`).join(', ')})
                )
            `;

            const [rows] = await this.bigquery.query(query);
            
            if (rows.length > 0) {
                return this.processBigQueryPrediction(modelName, rows[0]);
            }

            throw new Error('No prediction returned from BigQuery ML');

        } catch (error) {
            console.error('BigQuery ML prediction error:', error);
            throw error;
        }
    }

    prepareMLFeatures(modelName, ...inputData) {
        // Prepare features based on model type
        switch (modelName) {
            case 'weight_loss_predictor':
                return this.prepareWeightLossFeatures(...inputData);
            case 'workout_performance_predictor':
                return this.preparePerformanceFeatures(...inputData);
            case 'goal_achievement_predictor':
                return this.prepareGoalFeatures(...inputData);
            case 'injury_risk_predictor':
                return this.prepareInjuryFeatures(...inputData);
            default:
                return {};
        }
    }

    prepareWeightLossFeatures(userProfile, goalData) {
        return {
            age: userProfile.personalInfo?.age || 30,
            gender: userProfile.personalInfo?.gender === 'male' ? 1 : 0,
            starting_weight: userProfile.personalInfo?.weight || 70,
            height: userProfile.personalInfo?.height || 170,
            activity_level: this.mapActivityLevel(userProfile.fitnessGoals?.activityLevel),
            calorie_deficit: goalData.targetCalorieDeficit || 500,
            workout_frequency: userProfile.fitnessGoals?.workoutFrequency || 3
        };
    }

    preparePerformanceFeatures(userProfile, workoutHistory) {
        const recentWorkouts = workoutHistory.slice(-10);
        const avgIntensity = recentWorkouts.reduce((sum, w) => sum + (w.intensity || 5), 0) / recentWorkouts.length;
        
        return {
            current_strength: this.calculateCurrentStrength(recentWorkouts),
            workout_frequency: workoutHistory.length / 4, // per week
            rest_days: this.calculateRestDays(recentWorkouts),
            nutrition_score: userProfile.nutritionScore || 7,
            sleep_hours: userProfile.averageSleep || 7
        };
    }

    prepareGoalFeatures(goalData, progressHistory) {
        return {
            goal_type: this.mapGoalType(goalData.type),
            timeline_weeks: goalData.timelineWeeks || 12,
            current_progress: goalData.currentProgress || 0,
            consistency_score: this.calculateConsistencyScore(progressHistory),
            motivation_level: goalData.motivationLevel || 7
        };
    }

    prepareInjuryFeatures(userProfile, workoutData) {
        return {
            workout_intensity: workoutData.intensity || 5,
            recovery_time: workoutData.recoveryHours || 24,
            form_score: workoutData.formScore || 80,
            previous_injuries: userProfile.healthInfo?.previousInjuries || 0,
            age: userProfile.personalInfo?.age || 30
        };
    }

    processBigQueryPrediction(modelName, result) {
        switch (modelName) {
            case 'weight_loss_predictor':
                return this.processWeightLossPrediction(result);
            case 'workout_performance_predictor':
                return this.processPerformancePrediction(result);
            case 'goal_achievement_predictor':
                return this.processGoalPrediction(result);
            case 'injury_risk_predictor':
                return this.processInjuryPrediction(result);
            default:
                return result;
        }
    }

    // Local prediction fallbacks (when BigQuery is not available)
    predictWeightLossLocally(userProfile, goalData) {
        const age = userProfile.personalInfo?.age || 30;
        const weight = userProfile.personalInfo?.weight || 70;
        const height = userProfile.personalInfo?.height || 170;
        const activityLevel = userProfile.fitnessGoals?.activityLevel || 'moderate';
        const workoutFreq = userProfile.fitnessGoals?.workoutFrequency || 3;
        
        // Calculate BMR (Basal Metabolic Rate)
        const bmr = userProfile.personalInfo?.gender === 'male' 
            ? 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
            : 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
        
        // Activity multiplier
        const activityMultipliers = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            very_active: 1.9
        };
        
        const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);
        const calorieDeficit = goalData.targetCalorieDeficit || 500;
        const weeklyWeightLoss = (calorieDeficit * 7) / 7700; // 7700 calories = 1kg
        
        const timelineWeeks = goalData.timelineWeeks || 12;
        const predictedWeightLoss = weeklyWeightLoss * timelineWeeks;
        const finalWeight = weight - predictedWeightLoss;
        
        // Calculate confidence based on various factors
        let confidence = 0.7;
        if (workoutFreq >= 4) confidence += 0.1;
        if (calorieDeficit <= 750) confidence += 0.1;
        if (age < 40) confidence += 0.05;
        
        return {
            success: true,
            prediction: {
                currentWeight: weight,
                predictedFinalWeight: Math.round(finalWeight * 10) / 10,
                totalWeightLoss: Math.round(predictedWeightLoss * 10) / 10,
                weeklyWeightLoss: Math.round(weeklyWeightLoss * 10) / 10,
                timelineWeeks: timelineWeeks,
                confidence: Math.min(confidence, 0.95),
                milestones: this.generateWeightLossMilestones(weight, finalWeight, timelineWeeks),
                recommendations: this.generateWeightLossRecommendations(userProfile, goalData)
            },
            generatedBy: 'local_algorithm',
            timestamp: Date.now()
        };
    }

    predictPerformanceLocally(userProfile, workoutHistory) {
        const recentWorkouts = workoutHistory.slice(-10);
        const currentStrength = this.calculateCurrentStrength(recentWorkouts);
        const workoutFreq = workoutHistory.length / 4; // per week
        const consistency = this.calculateConsistencyScore(workoutHistory);
        
        // Performance improvement prediction
        let improvementRate = 0.02; // 2% per week base
        
        // Adjust based on factors
        if (workoutFreq >= 4) improvementRate += 0.005;
        if (consistency > 0.8) improvementRate += 0.005;
        if (userProfile.personalInfo?.age < 30) improvementRate += 0.003;
        
        const weeks = 12;
        const predictedImprovement = currentStrength * (Math.pow(1 + improvementRate, weeks) - 1);
        
        return {
            success: true,
            prediction: {
                currentPerformanceLevel: currentStrength,
                predictedImprovement: Math.round(predictedImprovement),
                improvementPercentage: Math.round(predictedImprovement / currentStrength * 100),
                timelineWeeks: weeks,
                confidence: Math.min(0.6 + consistency * 0.3, 0.9),
                milestones: this.generatePerformanceMilestones(currentStrength, predictedImprovement, weeks),
                recommendations: this.generatePerformanceRecommendations(userProfile, workoutHistory)
            },
            generatedBy: 'local_algorithm',
            timestamp: Date.now()
        };
    }

    predictGoalAchievementLocally(goalData, progressHistory) {
        const currentProgress = goalData.currentProgress || 0;
        const timelineWeeks = goalData.timelineWeeks || 12;
        const weeksElapsed = progressHistory.length;
        const weeksRemaining = Math.max(timelineWeeks - weeksElapsed, 0);
        
        // Calculate progress rate
        const progressRate = weeksElapsed > 0 ? currentProgress / weeksElapsed : 0;
        const projectedProgress = currentProgress + (progressRate * weeksRemaining);
        
        // Calculate achievement probability
        let achievementProbability = Math.min(projectedProgress / 100, 1);
        
        // Adjust based on consistency
        const consistency = this.calculateConsistencyScore(progressHistory);
        achievementProbability *= (0.5 + consistency * 0.5);
        
        // Adjust based on goal difficulty
        const difficultyMultipliers = {
            easy: 1.2,
            medium: 1.0,
            hard: 0.8,
            extreme: 0.6
        };
        
        achievementProbability *= difficultyMultipliers[goalData.difficulty] || 1.0;
        
        return {
            success: true,
            prediction: {
                currentProgress: currentProgress,
                projectedFinalProgress: Math.round(projectedProgress),
                achievementProbability: Math.round(achievementProbability * 100),
                weeksRemaining: weeksRemaining,
                requiredWeeklyProgress: weeksRemaining > 0 ? Math.round((100 - currentProgress) / weeksRemaining) : 0,
                confidence: Math.min(0.5 + consistency * 0.4, 0.85),
                milestones: this.generateGoalMilestones(currentProgress, 100, weeksRemaining),
                recommendations: this.generateGoalRecommendations(goalData, progressHistory)
            },
            generatedBy: 'local_algorithm',
            timestamp: Date.now()
        };
    }

    predictInjuryRiskLocally(userProfile, workoutData) {
        let riskScore = 0;
        
        // Age factor
        const age = userProfile.personalInfo?.age || 30;
        if (age > 40) riskScore += 0.1;
        if (age > 50) riskScore += 0.1;
        
        // Intensity factor
        const intensity = workoutData.intensity || 5;
        if (intensity > 8) riskScore += 0.2;
        if (intensity > 9) riskScore += 0.1;
        
        // Recovery factor
        const recoveryHours = workoutData.recoveryHours || 24;
        if (recoveryHours < 24) riskScore += 0.15;
        if (recoveryHours < 12) riskScore += 0.15;
        
        // Form factor
        const formScore = workoutData.formScore || 80;
        if (formScore < 70) riskScore += 0.2;
        if (formScore < 60) riskScore += 0.1;
        
        // Previous injuries
        const previousInjuries = userProfile.healthInfo?.previousInjuries || 0;
        riskScore += previousInjuries * 0.05;
        
        // Cap at 1.0
        riskScore = Math.min(riskScore, 1.0);
        
        let riskLevel, riskDescription;
        if (riskScore < 0.3) {
            riskLevel = 'low';
            riskDescription = 'Low injury risk - continue current routine';
        } else if (riskScore < 0.6) {
            riskLevel = 'medium';
            riskDescription = 'Moderate injury risk - consider adjustments';
        } else {
            riskLevel = 'high';
            riskDescription = 'High injury risk - reduce intensity and focus on recovery';
        }
        
        return {
            success: true,
            prediction: {
                riskScore: Math.round(riskScore * 100),
                riskLevel: riskLevel,
                riskDescription: riskDescription,
                confidence: 0.75,
                riskFactors: this.identifyRiskFactors(userProfile, workoutData),
                recommendations: this.generateInjuryPreventionRecommendations(riskLevel, userProfile, workoutData)
            },
            generatedBy: 'local_algorithm',
            timestamp: Date.now()
        };
    }

    // Helper methods
    mapActivityLevel(level) {
        const mapping = {
            sedentary: 1,
            light: 2,
            moderate: 3,
            active: 4,
            very_active: 5
        };
        return mapping[level] || 3;
    }

    mapGoalType(type) {
        const mapping = {
            weight_loss: 1,
            muscle_gain: 2,
            endurance: 3,
            strength: 4,
            general_fitness: 5
        };
        return mapping[type] || 5;
    }

    calculateCurrentStrength(workouts) {
        if (!workouts.length) return 50;
        
        const strengthWorkouts = workouts.filter(w => w.type === 'strength' || w.type === 'weight_training');
        if (!strengthWorkouts.length) return 50;
        
        // Simple strength calculation based on recent performance
        const avgCalories = strengthWorkouts.reduce((sum, w) => sum + (w.calories || 200), 0) / strengthWorkouts.length;
        const avgDuration = strengthWorkouts.reduce((sum, w) => sum + (w.duration || 30), 0) / strengthWorkouts.length;
        
        return Math.round((avgCalories / avgDuration) * 10);
    }

    calculateRestDays(workouts) {
        if (workouts.length < 2) return 1;
        
        let totalRestHours = 0;
        for (let i = 1; i < workouts.length; i++) {
            const timeDiff = new Date(workouts[i].date) - new Date(workouts[i-1].date);
            totalRestHours += timeDiff / (1000 * 60 * 60);
        }
        
        return Math.round(totalRestHours / (workouts.length - 1) / 24);
    }

    calculateConsistencyScore(history) {
        if (!history.length) return 0;
        
        const totalDays = history.length;
        const activeDays = history.filter(day => day.active || day.completed).length;
        
        return activeDays / totalDays;
    }

    generateWeightLossMilestones(startWeight, endWeight, weeks) {
        const milestones = [];
        const totalLoss = startWeight - endWeight;
        const milestoneCounts = Math.min(weeks / 2, 6); // Max 6 milestones
        
        for (let i = 1; i <= milestoneCounts; i++) {
            const progress = i / milestoneCounts;
            const milestoneWeight = startWeight - (totalLoss * progress);
            const milestoneWeek = Math.round(weeks * progress);
            
            milestones.push({
                week: milestoneWeek,
                weight: Math.round(milestoneWeight * 10) / 10,
                progress: Math.round(progress * 100)
            });
        }
        
        return milestones;
    }

    generatePerformanceMilestones(currentLevel, improvement, weeks) {
        const milestones = [];
        const milestoneCounts = Math.min(weeks / 3, 4); // Max 4 milestones
        
        for (let i = 1; i <= milestoneCounts; i++) {
            const progress = i / milestoneCounts;
            const milestoneLevel = currentLevel + (improvement * progress);
            const milestoneWeek = Math.round(weeks * progress);
            
            milestones.push({
                week: milestoneWeek,
                performanceLevel: Math.round(milestoneLevel),
                improvement: Math.round(improvement * progress)
            });
        }
        
        return milestones;
    }

    generateGoalMilestones(currentProgress, targetProgress, weeksRemaining) {
        const milestones = [];
        const progressNeeded = targetProgress - currentProgress;
        const milestoneCounts = Math.min(weeksRemaining / 2, 5);
        
        for (let i = 1; i <= milestoneCounts; i++) {
            const progress = i / milestoneCounts;
            const milestoneProgress = currentProgress + (progressNeeded * progress);
            const milestoneWeek = Math.round(weeksRemaining * progress);
            
            milestones.push({
                week: milestoneWeek,
                targetProgress: Math.round(milestoneProgress),
                description: `${Math.round(progress * 100)}% of goal completed`
            });
        }
        
        return milestones;
    }

    generateWeightLossRecommendations(userProfile, goalData) {
        const recommendations = [];
        
        recommendations.push("Maintain a consistent calorie deficit through diet and exercise");
        recommendations.push("Include both cardio and strength training in your routine");
        recommendations.push("Track your food intake to ensure you're meeting your calorie goals");
        recommendations.push("Stay hydrated and get adequate sleep for optimal results");
        
        if (goalData.targetCalorieDeficit > 750) {
            recommendations.push("Consider a smaller calorie deficit for more sustainable results");
        }
        
        return recommendations;
    }

    generatePerformanceRecommendations(userProfile, workoutHistory) {
        const recommendations = [];
        
        recommendations.push("Focus on progressive overload - gradually increase weight or reps");
        recommendations.push("Ensure adequate rest between intense training sessions");
        recommendations.push("Include variety in your workouts to prevent plateaus");
        recommendations.push("Pay attention to proper form to maximize gains and prevent injury");
        
        const consistency = this.calculateConsistencyScore(workoutHistory);
        if (consistency < 0.7) {
            recommendations.push("Improve workout consistency for better results");
        }
        
        return recommendations;
    }

    generateGoalRecommendations(goalData, progressHistory) {
        const recommendations = [];
        
        recommendations.push("Break your goal into smaller, manageable milestones");
        recommendations.push("Track your progress regularly to stay motivated");
        recommendations.push("Adjust your approach if you're falling behind schedule");
        
        const consistency = this.calculateConsistencyScore(progressHistory);
        if (consistency < 0.6) {
            recommendations.push("Focus on building consistent daily habits");
        }
        
        if (goalData.currentProgress < 25) {
            recommendations.push("Consider if your goal timeline is realistic and adjust if needed");
        }
        
        return recommendations;
    }

    identifyRiskFactors(userProfile, workoutData) {
        const factors = [];
        
        if (workoutData.intensity > 8) {
            factors.push("High workout intensity");
        }
        
        if (workoutData.recoveryHours < 24) {
            factors.push("Insufficient recovery time");
        }
        
        if (workoutData.formScore < 70) {
            factors.push("Poor exercise form");
        }
        
        if (userProfile.personalInfo?.age > 40) {
            factors.push("Age-related increased risk");
        }
        
        if (userProfile.healthInfo?.previousInjuries > 0) {
            factors.push("History of previous injuries");
        }
        
        return factors;
    }

    generateInjuryPreventionRecommendations(riskLevel, userProfile, workoutData) {
        const recommendations = [];
        
        if (riskLevel === 'high') {
            recommendations.push("Reduce workout intensity immediately");
            recommendations.push("Focus on proper warm-up and cool-down routines");
            recommendations.push("Consider working with a qualified trainer");
            recommendations.push("Prioritize rest and recovery");
        } else if (riskLevel === 'medium') {
            recommendations.push("Pay extra attention to exercise form");
            recommendations.push("Ensure adequate rest between intense sessions");
            recommendations.push("Include mobility and flexibility work");
        } else {
            recommendations.push("Continue current routine with good form");
            recommendations.push("Maintain consistent recovery practices");
        }
        
        recommendations.push("Listen to your body and don't ignore pain or discomfort");
        
        return recommendations;
    }

    async getComprehensivePredictions(userId, userProfile, fitnessData) {
        try {
            const predictions = await Promise.allSettled([
                this.predictWeightLoss(userId, userProfile, fitnessData.goals),
                this.predictWorkoutPerformance(userId, userProfile, fitnessData.workoutHistory),
                this.predictGoalAchievement(userId, fitnessData.primaryGoal, fitnessData.progressHistory),
                this.predictInjuryRisk(userId, userProfile, fitnessData.currentWorkout)
            ]);

            return {
                success: true,
                predictions: {
                    weightLoss: predictions[0].status === 'fulfilled' ? predictions[0].value : null,
                    performance: predictions[1].status === 'fulfilled' ? predictions[1].value : null,
                    goalAchievement: predictions[2].status === 'fulfilled' ? predictions[2].value : null,
                    injuryRisk: predictions[3].status === 'fulfilled' ? predictions[3].value : null
                },
                generatedAt: Date.now()
            };

        } catch (error) {
            console.error('Comprehensive predictions error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getStatus() {
        return {
            bigQueryEnabled: !!this.bigquery,
            modelsLoaded: this.modelsCache.size,
            cachedPredictions: this.predictionCache.size,
            capabilities: [
                'Weight loss prediction',
                'Performance forecasting',
                'Goal achievement probability',
                'Injury risk assessment',
                'ML-powered insights'
            ]
        };
    }
}

module.exports = new ProgressPredictionService();