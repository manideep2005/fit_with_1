import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar';
import './Dashboard.css';

const Dashboard = ({ user }) => {
  const [dashboardData, setDashboardData] = useState({
    stats: {
      workoutsThisWeek: 0,
      targetWorkoutsPerWeek: 5,
      todayCalories: 0,
      targetCalories: 2000,
      todayProtein: 0,
      targetProtein: 150,
      todayWater: 0,
      targetWater: 2000
    },
    recentWorkouts: []
  });
  
  const [quickLogModal, setQuickLogModal] = useState({ isOpen: false, type: 'workout' });
  const [gamificationModal, setGamificationModal] = useState(false);
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    loadDashboardData();
    loadDailyInsights();
    setDynamicGreeting();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard-data');
      const result = await response.json();
      
      if (result.success) {
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadDailyInsights = async () => {
    try {
      const response = await fetch('/api/insights/daily');
      const result = await response.json();
      
      if (result.success && result.insights.length > 0) {
        setInsights(result.insights);
      } else {
        setInsights([
          {
            icon: '💪',
            title: 'Ready to Start!',
            message: 'Log your first workout to get personalized insights and recommendations.',
            priority: 'medium',
            action: 'Log Workout'
          },
          {
            icon: '💧',
            title: 'Stay Hydrated',
            message: 'Remember to drink water throughout the day. Aim for 8-10 glasses daily.',
            priority: 'low',
            action: 'Log Water'
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const setDynamicGreeting = () => {
    const hour = new Date().getHours();
    const userName = user?.onboardingData?.personalInfo?.firstName || 
                    (user?.fullName && user.fullName !== "User" ? user.fullName.split(" ")[0] : "User");
    
    let greeting;
    if (hour < 12) {
      greeting = `Good Morning, ${userName}! 🌅`;
    } else if (hour < 17) {
      greeting = `Good Afternoon, ${userName}! ☀️`;
    } else {
      greeting = `Good Evening, ${userName}! 🌆`;
    }
    
    return greeting;
  };

  const handleQuickLog = async (formData) => {
    const { type, data } = formData;
    let endpoint = '';
    
    switch (type) {
      case 'workout':
        endpoint = '/api/workouts';
        break;
      case 'nutrition':
        endpoint = '/api/nutrition';
        break;
      case 'biometrics':
        endpoint = '/api/biometrics';
        break;
      default:
        return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (result.success) {
        setQuickLogModal({ isOpen: false, type: 'workout' });
        loadDashboardData();
        toast.success(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} logged successfully! 🎉`);
        
        if (result.gamification) {
          showGamificationNotifications(result.gamification);
        }
      } else {
        toast.error(`❌ Failed to log ${type}: ${result.error}`);
      }
    } catch (error) {
      toast.error('❌ Network error - please try again');
    }
  };

  const showGamificationNotifications = (gamificationData) => {
    if (gamificationData.xp > 0) {
      setTimeout(() => toast.success(`+${gamificationData.xp} XP 🎯`), 1000);
    }
    
    if (gamificationData.levelUp) {
      setTimeout(() => toast.success('Level Up! 🎉'), 2000);
    }
  };

  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <Sidebar user={user} currentPage="dashboard" />
        
        <div className="main-content">
          {/* Header */}
          <div className="page-header">
            <h1 className="page-title">Dashboard</h1>
            <div className="header-buttons">
              <button 
                className="btn btn-outline"
                onClick={() => setGamificationModal(true)}
              >
                <i className="fas fa-trophy"></i> Gamification
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setQuickLogModal({ isOpen: true, type: 'workout' })}
              >
                <i className="fas fa-plus"></i> Quick Log
              </button>
              <button 
                className="btn btn-success"
                onClick={() => window.location.href = '/nutriscan'}
              >
                <i className="fas fa-qrcode"></i> Scan Food
              </button>
            </div>
          </div>

          {/* Welcome Card */}
          <motion.div 
            className="welcome-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="welcome-title">{setDynamicGreeting()}</h2>
            <p className="welcome-subtitle">Ready to crush your fitness goals today?</p>
            <button className="btn btn-outline welcome-btn">
              View Weekly Report
            </button>
          </motion.div>

          {/* Daily Insights */}
          <div className="daily-insights">
            <h3 className="section-title">💡 Today's Insights</h3>
            <div className="insights-grid">
              {insights.map((insight, index) => (
                <motion.div 
                  key={index}
                  className={`insight-card ${insight.priority}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <div className="insight-icon">{insight.icon}</div>
                  <div className="insight-content">
                    <h4>{insight.title}</h4>
                    <p>{insight.message}</p>
                    {insight.action && (
                      <button 
                        className="insight-action"
                        onClick={() => {
                          if (insight.action === 'Log Workout') {
                            setQuickLogModal({ isOpen: true, type: 'workout' });
                          }
                        }}
                      >
                        {insight.action}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <StatCard
              label="Workouts This Week"
              value={`${dashboardData.stats.workoutsThisWeek}/${dashboardData.stats.targetWorkoutsPerWeek}`}
              progress={calculateProgress(dashboardData.stats.workoutsThisWeek, dashboardData.stats.targetWorkoutsPerWeek)}
              bgImage="url('https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&h=300')"
            />
            <StatCard
              label="Calories Today"
              value={dashboardData.stats.todayCalories.toLocaleString()}
              progress={calculateProgress(dashboardData.stats.todayCalories, dashboardData.stats.targetCalories)}
              bgImage="url('https://images.unsplash.com/photo-1571008887538-b36bb32f4571?auto=format&fit=crop&w=400&h=300')"
            />
            <StatCard
              label="Protein Intake"
              value={`${dashboardData.stats.todayProtein}g`}
              progress={calculateProgress(dashboardData.stats.todayProtein, dashboardData.stats.targetProtein)}
              bgImage="url('https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=400&h=300')"
            />
            <StatCard
              label="Water Intake"
              value={`${(dashboardData.stats.todayWater / 1000).toFixed(1)}L`}
              progress={calculateProgress(dashboardData.stats.todayWater, dashboardData.stats.targetWater)}
              bgImage="url('https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=400&h=300')"
            />
          </div>

          {/* Recent Workouts */}
          <div className="workout-plan">
            <div className="workout-header">
              <h2 className="section-title">Recent Workouts</h2>
              <button className="btn btn-outline">View All</button>
            </div>
            
            <div className="recent-workouts">
              {dashboardData.recentWorkouts.length > 0 ? (
                dashboardData.recentWorkouts.map((workout, index) => (
                  <WorkoutItem key={index} workout={workout} />
                ))
              ) : (
                <div className="workout-day">
                  <div className="day-name">No workouts yet</div>
                  <div className="day-workout">Start your fitness journey by logging your first workout!</div>
                  <div className="day-status"><i className="fas fa-plus"></i></div>
                </div>
              )}
            </div>
          </div>

          {/* AI Nutrition Tip */}
          <div className="nutrition-tip">
            <div className="tip-header">
              <div className="tip-icon">
                <i className="fas fa-lightbulb"></i>
              </div>
              <h3 className="tip-title">AI Nutrition Tip</h3>
            </div>
            <p className="tip-content">
              Based on your recent workouts, consider increasing your protein intake by 10-15g post-workout 
              to support muscle recovery. Try adding a scoop of whey protein or a chicken breast to your post-workout meal.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Log Modal */}
      {quickLogModal.isOpen && (
        <QuickLogModal
          type={quickLogModal.type}
          onClose={() => setQuickLogModal({ isOpen: false, type: 'workout' })}
          onSubmit={handleQuickLog}
          onTypeChange={(type) => setQuickLogModal(prev => ({ ...prev, type }))}
        />
      )}

      {/* Gamification Modal */}
      {gamificationModal && (
        <GamificationModal
          onClose={() => setGamificationModal(false)}
        />
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ label, value, progress, bgImage }) => (
  <motion.div 
    className="stat-card"
    style={{ '--bg-image': bgImage }}
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.8, type: "spring" }}
    whileHover={{ y: -10, scale: 1.02 }}
  >
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    <div className="progress-bar">
      <motion.div 
        className="progress-fill"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1, delay: 0.5 }}
      />
    </div>
  </motion.div>
);

// Workout Item Component
const WorkoutItem = ({ workout }) => {
  const workoutDate = new Date(workout.date);
  const dayName = workoutDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = workoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="workout-day">
      <div className="day-name">
        {dayName}<br />
        <small>{dateStr}</small>
      </div>
      <div className="day-workout">
        {workout.type} - {workout.duration}min, {workout.calories} cal
      </div>
      <div className="day-status completed">
        <i className="fas fa-check"></i>
      </div>
    </div>
  );
};

// Quick Log Modal Component
const QuickLogModal = ({ type, onClose, onSubmit, onTypeChange }) => {
  const [formData, setFormData] = useState({
    workout: { type: '', duration: '', calories: '', notes: '' },
    nutrition: { calories: '', protein: '', carbs: '', fat: '', water: '' },
    biometrics: { weight: '', bodyFat: '', muscleMass: '' }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let data = {};
    if (type === 'workout') {
      data = {
        type: formData.workout.type,
        duration: parseInt(formData.workout.duration) || 0,
        calories: parseInt(formData.workout.calories) || 0,
        notes: formData.workout.notes
      };
    } else if (type === 'nutrition') {
      data = {
        meals: [{
          name: 'Quick Log Entry',
          calories: parseInt(formData.nutrition.calories) || 0,
          protein: parseFloat(formData.nutrition.protein) || 0,
          carbs: parseFloat(formData.nutrition.carbs) || 0,
          fat: parseFloat(formData.nutrition.fat) || 0
        }],
        totalCalories: parseInt(formData.nutrition.calories) || 0,
        totalProtein: parseFloat(formData.nutrition.protein) || 0,
        totalCarbs: parseFloat(formData.nutrition.carbs) || 0,
        totalFat: parseFloat(formData.nutrition.fat) || 0,
        waterIntake: parseInt(formData.nutrition.water) || 0
      };
    } else if (type === 'biometrics') {
      data = {
        weight: parseFloat(formData.biometrics.weight) || null,
        bodyFat: parseFloat(formData.biometrics.bodyFat) || null,
        muscleMass: parseFloat(formData.biometrics.muscleMass) || null
      };
    }

    onSubmit({ type, data });
  };

  const handleInputChange = (category, field, value) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const quickAddFood = (foodName, calories) => {
    const commonFoods = {
      'Banana': { calories: 105, protein: 1, carbs: 27, fat: 0 },
      'Apple': { calories: 95, protein: 0, carbs: 25, fat: 0 },
      'Protein Shake': { calories: 120, protein: 25, carbs: 3, fat: 1 },
      'Chicken Breast': { calories: 165, protein: 31, carbs: 0, fat: 4 }
    };
    
    const food = commonFoods[foodName];
    if (food) {
      setFormData(prev => ({
        ...prev,
        nutrition: {
          ...prev.nutrition,
          calories: food.calories.toString(),
          protein: food.protein.toString(),
          carbs: food.carbs.toString(),
          fat: food.fat.toString()
        }
      }));
      toast.success(`🍎 ${foodName} added to form!`);
    }
  };

  return (
    <motion.div 
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="quick-log-modal"
        initial={{ scale: 0.3, rotateY: 180 }}
        animate={{ scale: 1, rotateY: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
      >
        <div className="modal-header">
          <h3>⚡ Quick Log</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="log-type-selector">
            <label>Log Type:</label>
            <select value={type} onChange={(e) => onTypeChange(e.target.value)}>
              <option value="workout">🏋️ Workout</option>
              <option value="nutrition">🍎 Nutrition</option>
              <option value="biometrics">📊 Biometrics</option>
            </select>
          </div>

          <form onSubmit={handleSubmit}>
            {type === 'workout' && (
              <WorkoutForm 
                data={formData.workout}
                onChange={(field, value) => handleInputChange('workout', field, value)}
              />
            )}

            {type === 'nutrition' && (
              <NutritionForm 
                data={formData.nutrition}
                onChange={(field, value) => handleInputChange('nutrition', field, value)}
                onQuickAdd={quickAddFood}
              />
            )}

            {type === 'biometrics' && (
              <BiometricsForm 
                data={formData.biometrics}
                onChange={(field, value) => handleInputChange('biometrics', field, value)}
              />
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                💾 Save Log
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Form Components
const WorkoutForm = ({ data, onChange }) => (
  <div className="form-section">
    <div className="form-group">
      <label>Workout Type:</label>
      <input 
        type="text" 
        placeholder="e.g., Cardio, Strength Training"
        value={data.type}
        onChange={(e) => onChange('type', e.target.value)}
      />
    </div>
    <div className="form-row">
      <div className="form-group">
        <label>Duration (min):</label>
        <input 
          type="number" 
          placeholder="30"
          value={data.duration}
          onChange={(e) => onChange('duration', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Calories:</label>
        <input 
          type="number" 
          placeholder="200"
          value={data.calories}
          onChange={(e) => onChange('calories', e.target.value)}
        />
      </div>
    </div>
    <div className="form-group">
      <label>Notes:</label>
      <textarea 
        placeholder="How did it go?"
        value={data.notes}
        onChange={(e) => onChange('notes', e.target.value)}
      />
    </div>
  </div>
);

const NutritionForm = ({ data, onChange, onQuickAdd }) => (
  <div className="form-section">
    <div className="form-row">
      <div className="form-group">
        <label>Calories:</label>
        <input 
          type="number" 
          placeholder="500"
          value={data.calories}
          onChange={(e) => onChange('calories', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Protein (g):</label>
        <input 
          type="number" 
          placeholder="25"
          value={data.protein}
          onChange={(e) => onChange('protein', e.target.value)}
        />
      </div>
    </div>
    <div className="form-row">
      <div className="form-group">
        <label>Carbs (g):</label>
        <input 
          type="number" 
          placeholder="50"
          value={data.carbs}
          onChange={(e) => onChange('carbs', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Fat (g):</label>
        <input 
          type="number" 
          placeholder="15"
          value={data.fat}
          onChange={(e) => onChange('fat', e.target.value)}
        />
      </div>
    </div>
    <div className="form-group">
      <label>Water Intake (ml):</label>
      <input 
        type="number" 
        placeholder="500"
        value={data.water}
        onChange={(e) => onChange('water', e.target.value)}
      />
    </div>
    <div className="quick-foods">
      <h4>🍎 Quick Add Foods:</h4>
      <div className="food-buttons">
        <button type="button" onClick={() => onQuickAdd('Banana', 105)}>🍌 Banana</button>
        <button type="button" onClick={() => onQuickAdd('Apple', 95)}>🍎 Apple</button>
        <button type="button" onClick={() => onQuickAdd('Protein Shake', 120)}>🥤 Protein</button>
        <button type="button" onClick={() => onQuickAdd('Chicken Breast', 165)}>🍗 Chicken</button>
      </div>
    </div>
  </div>
);

const BiometricsForm = ({ data, onChange }) => (
  <div className="form-section">
    <div className="form-row">
      <div className="form-group">
        <label>Weight (kg):</label>
        <input 
          type="number" 
          placeholder="70"
          step="0.1"
          value={data.weight}
          onChange={(e) => onChange('weight', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Body Fat (%):</label>
        <input 
          type="number" 
          placeholder="15"
          step="0.1"
          value={data.bodyFat}
          onChange={(e) => onChange('bodyFat', e.target.value)}
        />
      </div>
    </div>
    <div className="form-group">
      <label>Muscle Mass (kg):</label>
      <input 
        type="number" 
        placeholder="35"
        step="0.1"
        value={data.muscleMass}
        onChange={(e) => onChange('muscleMass', e.target.value)}
      />
    </div>
  </div>
);

// Gamification Modal Component
const GamificationModal = ({ onClose }) => {
  const [gamificationData, setGamificationData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGamificationData();
  }, []);

  const loadGamificationData = async () => {
    try {
      const response = await fetch('/api/gamification-data');
      const result = await response.json();
      
      if (result.success) {
        setGamificationData(result.data);
      }
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="gamification-modal">
          <div className="loading-state">
            <div>🏆</div>
            <div>Loading your achievements...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="gamification-modal"
        initial={{ scale: 0.3, y: -100 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
      >
        <div className="modal-header gamification-header">
          <div>
            <h2>🏆 Your Fitness Journey</h2>
            <p>Level up your fitness game!</p>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="gamification-content">
          {gamificationData && (
            <>
              {/* Level & XP Section */}
              <div className="level-section">
                <div className="level-info">
                  <div>
                    <h3>Level {gamificationData.level || 1}</h3>
                    <p>Fitness Enthusiast</p>
                  </div>
                  <div className="xp-info">
                    <div className="total-xp">{(gamificationData.totalXP || 0).toLocaleString()} XP</div>
                    <div className="xp-to-next">{gamificationData.xpToNextLevel || 0} XP to next level</div>
                  </div>
                </div>
                <div className="level-progress-bar">
                  <div 
                    className="level-progress-fill"
                    style={{ width: `${gamificationData.progressToNextLevel || 0}%` }}
                  />
                </div>
              </div>

              {/* Stats and other gamification content would go here */}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;