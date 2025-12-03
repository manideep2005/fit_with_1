import React, { useState, useEffect } from 'react';
import './Nutrition.css';

const Nutrition = () => {
  const [nutritionData, setNutritionData] = useState(null);
  const [currentMealFilter, setCurrentMealFilter] = useState('all');
  const [currentWaterIntake, setCurrentWaterIntake] = useState(0);
  const [waterGoal] = useState(2500);
  const [showLogFoodModal, setShowLogFoodModal] = useState(false);
  const [foodSearch, setFoodSearch] = useState('');
  const [mealType, setMealType] = useState('breakfast');
  const [quantity, setQuantity] = useState(1);
  const [meals, setMeals] = useState([]);

  useEffect(() => {
    loadNutritionData();
    loadTodaysMeals();
    loadAIInsights();
    initializeWaterTracker();
  }, []);

  const initializeWaterTracker = async () => {
    try {
      const response = await fetch('/api/nutrition/progress');
      const data = await response.json();
      
      if (data.success && data.data.progress.water) {
        setCurrentWaterIntake(data.data.progress.water.current);
      }
    } catch (error) {
      console.error('Error initializing water tracker:', error);
    }
  };

  const addWater = async (amount) => {
    try {
      const response = await fetch('/api/nutrition/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      
      if (response.ok) {
        setCurrentWaterIntake(prev => Math.min(prev + amount, waterGoal * 2));
        showNotification(`✅ Added ${amount}ml water! 💧`, 'success');
        
        if (currentWaterIntake + amount >= waterGoal && currentWaterIntake < waterGoal) {
          showNotification('🎉 Daily water goal achieved!', 'success');
        }
        
        setTimeout(() => loadNutritionData(), 500);
      }
    } catch (error) {
      console.error('Error logging water:', error);
      showNotification('❌ Network error', 'error');
    }
  };

  const loadNutritionData = async () => {
    try {
      const response = await fetch('/api/nutrition/progress');
      const data = await response.json();
      
      if (data.success) {
        setNutritionData(data.data);
      } else {
        setNutritionData({
          progress: {
            calories: { current: 0, goal: 2000, percentage: 0 },
            protein: { current: 0, goal: 150, percentage: 0 },
            carbs: { current: 0, goal: 250, percentage: 0 },
            fat: { current: 0, goal: 67, percentage: 0 },
            water: { current: 0, goal: 2500, percentage: 0 }
          }
        });
      }
    } catch (error) {
      console.error('Error loading nutrition data:', error);
    }
  };

  const loadTodaysMeals = async () => {
    try {
      const response = await fetch('/api/nutrition/meals/today');
      const data = await response.json();
      
      if (data.success && data.meals) {
        setMeals(data.meals);
      }
    } catch (error) {
      console.error('Error loading meals:', error);
    }
  };

  const loadAIInsights = async () => {
    // Load AI insights - placeholder for now
  };

  const quickLog = async (foodName) => {
    try {
      showNotification(`Adding ${foodName}...`, 'info');
      
      const response = await fetch('/api/nutrition/quick-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName, quantity: 1 })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification(`✅ ${foodName} logged successfully!`, 'success');
        setTimeout(() => {
          loadNutritionData();
          loadTodaysMeals();
        }, 500);
      } else {
        showNotification(`❌ ${data.error || 'Failed to log food'}`, 'error');
      }
    } catch (error) {
      console.error('Quick log error:', error);
      showNotification('❌ Network error - please try again', 'error');
    }
  };

  const handleLogFood = async (e) => {
    e.preventDefault();
    
    const formData = {
      meals: [{
        name: foodSearch,
        type: mealType,
        quantity: quantity,
        time: new Date().toLocaleTimeString()
      }],
      totalCalories: 300 // This would be calculated
    };
    
    try {
      const response = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('Food logged successfully!', 'success');
        setShowLogFoodModal(false);
        setFoodSearch('');
        setQuantity(1);
        loadNutritionData();
        loadTodaysMeals();
      } else {
        showNotification(data.error, 'error');
      }
    } catch (error) {
      console.error('Error logging food:', error);
      showNotification('Failed to log food', 'error');
    }
  };

  const showNotification = (message, type = 'info') => {
    // Simple notification - you can enhance this with a proper toast library
    alert(message);
  };

  const progress = nutritionData?.progress || {
    calories: { current: 0, goal: 2000, percentage: 0 },
    protein: { current: 0, goal: 150, percentage: 0 },
    carbs: { current: 0, goal: 250, percentage: 0 },
    fat: { current: 0, goal: 67, percentage: 0 },
    water: { current: 0, goal: 2500, percentage: 0 }
  };

  const waterPercentage = (currentWaterIntake / waterGoal) * 100;

  return (
    <div className="nutrition-page">
      <div className="dashboard-container">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-header">
            <img src="https://ui-avatars.com/api/?name=User&background=6C63FF&color=fff" alt="Profile" />
            <div>
              <h3 className="user-name">User</h3>
              <div className="user-plan">Free Plan</div>
            </div>
          </div>
          
          <ul className="nav-menu">
            <li className="nav-item">
              <a href="/dashboard" className="nav-link">
                <i className="fas fa-tachometer-alt"></i> Dashboard
              </a>
            </li>
            <li className="nav-item">
              <a href="/workouts" className="nav-link">
                <i className="fas fa-dumbbell"></i> Workouts
              </a>
            </li>
            <li className="nav-item">
              <a href="/nutrition" className="nav-link active">
                <i className="fas fa-utensils"></i> Nutrition
              </a>
            </li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <div className="page-header">
            <h1 className="page-title">Nutrition</h1>
            <div>
              <button className="btn btn-primary" onClick={() => setShowLogFoodModal(true)}>
                <i className="fas fa-plus"></i> Log Food
              </button>
              <button className="btn btn-outline" onClick={() => window.location.href='/nutriscan'} style={{marginLeft: '10px'}}>
                <i className="fas fa-camera"></i> Scan
              </button>
            </div>
          </div>
          
          {/* Nutrition Score & Streak */}
          <div className="nutrition-header">
            <div className="nutrition-score-card">
              <div className="score-circle">
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="35" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none"/>
                  <circle cx="40" cy="40" r="35" stroke="#28A745" strokeWidth="6" fill="none" 
                    strokeDasharray="220" strokeDashoffset="220" strokeLinecap="round"/>
                </svg>
                <div className="score-text">0</div>
              </div>
              <div className="score-label">Nutrition Score</div>
            </div>
            <div className="streak-badges">
              <div className="achievement-badges">
                <span className="badge" style={{opacity: 0.3}}>🏆 Start logging to unlock</span>
              </div>
            </div>
          </div>
          
          {/* Water Intake Tracker */}
          <div className="water-tracker">
            <h3>💧 Water Intake</h3>
            <div className="water-bottle-container">
              <div className="water-bottle">
                <div className="water-fill" style={{height: `${waterPercentage}%`}}></div>
                <div className="water-level">{(currentWaterIntake/1000).toFixed(1)}L / {(waterGoal/1000).toFixed(1)}L</div>
              </div>
              <div className="water-controls">
                <button className="water-btn" onClick={() => addWater(250)}>+250ml</button>
                <button className="water-btn" onClick={() => addWater(500)}>+500ml</button>
                <button className="water-btn" onClick={() => addWater(750)}>+750ml</button>
              </div>
            </div>
          </div>
          
          <h2>Today's Summary</h2>
          <div className="nutrition-summary">
            <div className={`nutrition-card ${progress.calories.percentage >= 100 ? 'goal-reached' : ''}`}>
              <div className="progress-ring">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" className="progress-ring-circle" 
                    strokeDashoffset={283 - (283 * Math.min(progress.calories.percentage, 100) / 100)} />
                </svg>
                <div className="progress-ring-text">{progress.calories.current}</div>
              </div>
              <div className="nutrition-label">Calories</div>
              <div className="nutrition-value">{progress.calories.current}</div>
              <div className="nutrition-label">of {progress.calories.goal} goal ({progress.calories.percentage}%)</div>
            </div>
            
            <div className={`nutrition-card ${progress.protein.percentage >= 100 ? 'goal-reached' : ''}`}>
              <div className="progress-ring">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" className="progress-ring-circle" 
                    strokeDashoffset={283 - (283 * Math.min(progress.protein.percentage, 100) / 100)} style={{stroke: '#4D44DB'}} />
                </svg>
                <div className="progress-ring-text">{progress.protein.current}g</div>
              </div>
              <div className="nutrition-label">Protein</div>
              <div className="nutrition-value">{progress.protein.current}g</div>
              <div className="nutrition-label">of {progress.protein.goal}g goal ({progress.protein.percentage}%)</div>
            </div>
            
            <div className={`nutrition-card ${progress.carbs.percentage >= 100 ? 'goal-reached' : ''}`}>
              <div className="progress-ring">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" className="progress-ring-circle" 
                    strokeDashoffset={283 - (283 * Math.min(progress.carbs.percentage, 100) / 100)} style={{stroke: '#FF6584'}} />
                </svg>
                <div className="progress-ring-text">{progress.carbs.current}g</div>
              </div>
              <div className="nutrition-label">Carbs</div>
              <div className="nutrition-value">{progress.carbs.current}g</div>
              <div className="nutrition-label">of {progress.carbs.goal}g goal ({progress.carbs.percentage}%)</div>
            </div>
            
            <div className={`nutrition-card ${progress.water.percentage >= 100 ? 'goal-reached' : ''}`}>
              <div className="progress-ring">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" className="progress-ring-circle" 
                    strokeDashoffset={283 - (283 * Math.min(progress.water.percentage, 100) / 100)} style={{stroke: '#28A745'}} />
                </svg>
                <div className="progress-ring-text">{progress.water.current}ml</div>
              </div>
              <div className="nutrition-label">Water</div>
              <div className="nutrition-value">{progress.water.current}ml</div>
              <div className="nutrition-label">of {progress.water.goal}ml goal ({progress.water.percentage}%)</div>
            </div>
          </div>
          
          {/* Smart Suggestions */}
          <div className="smart-suggestions">
            <h3>🎯 Smart Suggestions</h3>
            <div className="suggestion-cards">
              <div className="suggestion-card">
                <div className="suggestion-icon">🍽️</div>
                <div className="suggestion-text">Start logging your meals to get personalized suggestions!</div>
                <div className="suggested-foods">
                  <span className="food-tag" onClick={() => quickLog('Banana')}>Banana</span>
                  <span className="food-tag" onClick={() => quickLog('Apple')}>Apple</span>
                  <span className="food-tag" onClick={() => quickLog('Protein Shake')}>Protein Shake</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="quick-actions">
            <button className="action-btn" onClick={() => setShowLogFoodModal(true)}>
              <i className="fas fa-plus"></i>
              <span>Log Meal</span>
            </button>
            <button className="action-btn" onClick={() => window.location.href='/nutriscan'}>
              <i className="fas fa-barcode"></i>
              <span>Scan Barcode</span>
            </button>
            <button className="action-btn">
              <i className="fas fa-utensils"></i>
              <span>Recipes</span>
            </button>
            <button className="action-btn">
              <i className="fas fa-calendar"></i>
              <span>Meal Plan</span>
            </button>
          </div>
          
          {/* Today's Meals */}
          <h2>Today's Meals</h2>
          <div className="meals-section">
            <div className="meal-tabs">
              {['all', 'breakfast', 'lunch', 'dinner', 'snacks'].map(type => (
                <div 
                  key={type}
                  className={`meal-tab ${currentMealFilter === type ? 'active' : ''}`}
                  onClick={() => setCurrentMealFilter(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </div>
              ))}
            </div>
            
            <div className="meals-list">
              {meals.length === 0 ? (
                <p>No meals logged yet today.</p>
              ) : (
                meals
                  .filter(meal => currentMealFilter === 'all' || meal.type === currentMealFilter)
                  .map((meal, index) => (
                    <div key={index} className="meal-item">
                      <div className="meal-info">
                        <div className="meal-icon">
                          <i className={`fas fa-${meal.icon || 'utensils'}`}></i>
                        </div>
                        <div>
                          <div className="meal-name">{meal.name}</div>
                          <div className="meal-time">{meal.time} • {meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}</div>
                        </div>
                      </div>
                      <div className="meal-calories">{meal.calories} kcal</div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Log Food Modal */}
      {showLogFoodModal && (
        <div className="modal" style={{display: 'block'}}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Log Food</h3>
              <span className="close" onClick={() => setShowLogFoodModal(false)}>&times;</span>
            </div>
            <form onSubmit={handleLogFood}>
              <div className="form-group">
                <label>Search Food</label>
                <input 
                  type="text" 
                  value={foodSearch}
                  onChange={(e) => setFoodSearch(e.target.value)}
                  placeholder="Search for food..."
                />
              </div>
              <div className="form-group">
                <label>Meal Type</label>
                <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snacks">Snacks</option>
                </select>
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input 
                  type="number" 
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value))}
                  min="0.1" 
                  step="0.1"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowLogFoodModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Log Food</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Nutrition;