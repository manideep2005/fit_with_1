import React, { useState, useEffect } from 'react';
import './MealPlanner.css';

const MealPlanner = () => {
  const [showAssessment, setShowAssessment] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [healthAnswers, setHealthAnswers] = useState({});
  const [healthQuestions, setHealthQuestions] = useState([]);
  const [mealPlan, setMealPlan] = useState(null);
  const [nutritionTargets, setNutritionTargets] = useState(null);
  const [loading, setLoading] = useState(false);

  const startHealthAssessment = async () => {
    try {
      setLoading(true);
      showNotification('Loading health assessment questions...', 'info');
      
      const response = await fetch('/api/meal-planner/health-questions');
      const data = await response.json();
      
      if (data.success) {
        setHealthQuestions(data.questions);
        setCurrentQuestion(0);
        setHealthAnswers({});
        setShowAssessment(true);
        showNotification('Health assessment started!', 'success');
      } else {
        showNotification('Failed to load health assessment', 'error');
      }
    } catch (error) {
      showNotification('Error starting health assessment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectOption = (questionId, value) => {
    setHealthAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const toggleMultiOption = (questionId, value) => {
    setHealthAnswers(prev => {
      const currentAnswers = prev[questionId] || [];
      const index = currentAnswers.indexOf(value);
      
      if (index > -1) {
        return {
          ...prev,
          [questionId]: currentAnswers.filter(item => item !== value)
        };
      } else {
        return {
          ...prev,
          [questionId]: [...currentAnswers, value]
        };
      }
    });
  };

  const saveNumberInput = (questionId, value) => {
    setHealthAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const nextQuestion = () => {
    if (currentQuestion < healthQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      completeAssessment();
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const completeAssessment = async () => {
    try {
      setLoading(true);
      showNotification('Processing your health assessment...', 'info');
      
      const response = await fetch('/api/meal-planner/health-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: healthAnswers })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNutritionTargets(data.nutritionTargets);
        setMealPlan(data.mealPlan);
        setShowAssessment(false);
        showNotification('Your personalized meal plan is ready!', 'success');
      } else {
        showNotification('Failed to generate meal plan: ' + data.error, 'error');
      }
    } catch (error) {
      showNotification('Error generating meal plan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type) => {
    // Simple notification - can be enhanced with a proper toast library
    alert(message);
  };

  const formatOptionText = (option) => {
    return option.charAt(0).toUpperCase() + 
           option.slice(1)
                 .replace(/_/g, ' ')
                 .replace(/([a-z])([A-Z])/g, '$1 $2');
  };

  const renderQuestion = (question) => {
    if (!question) return null;

    const answer = healthAnswers[question.id];

    switch (question.type) {
      case 'number':
        return (
          <div className="number-input-container">
            <input
              type="number"
              className="question-input"
              min={question.min || 0}
              max={question.max || 1000}
              value={answer || ''}
              placeholder={`Enter ${question.question.toLowerCase()}`}
              onChange={(e) => saveNumberInput(question.id, e.target.value)}
            />
            {question.unit && <span className="input-unit">{question.unit}</span>}
          </div>
        );

      case 'select':
        return (
          <div className="question-options">
            {question.options.map((option, index) => {
              const value = typeof option === 'object' ? option.value : option;
              const label = typeof option === 'object' ? option.label : formatOptionText(option);
              const description = typeof option === 'object' ? option.description : null;
              const isSelected = answer === value;

              return (
                <div
                  key={index}
                  className={`option-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectOption(question.id, value)}
                >
                  <div className="option-header">
                    <strong>{label}</strong>
                    {isSelected && <i className="fas fa-check-circle"></i>}
                  </div>
                  {description && <p className="option-description">{description}</p>}
                </div>
              );
            })}
          </div>
        );

      case 'multiselect':
        return (
          <div className="multiselect-options">
            {question.options.map((option, index) => {
              const isSelected = answer && answer.includes(option);
              return (
                <div
                  key={index}
                  className={`multiselect-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleMultiOption(question.id, option)}
                >
                  <div className="checkbox-container">
                    <input type="checkbox" checked={isSelected} readOnly />
                    <span className="checkmark"></span>
                  </div>
                  <span className="option-text">{formatOptionText(option)}</span>
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  const renderMealPlan = () => {
    if (!mealPlan || !nutritionTargets) return null;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
      <div className="meal-plan-section">
        <div className="daily-summary">
          <h2 className="summary-title">Your Personalized Nutrition Plan</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-value">{nutritionTargets.calories}</div>
              <div className="summary-label">Target Calories</div>
            </div>
            <div className="summary-item">
              <div className="summary-value">{nutritionTargets.protein}g</div>
              <div className="summary-label">Target Protein</div>
            </div>
            <div className="summary-item">
              <div className="summary-value">{nutritionTargets.carbs}g</div>
              <div className="summary-label">Target Carbs</div>
            </div>
            <div className="summary-item">
              <div className="summary-value">{nutritionTargets.fat}g</div>
              <div className="summary-label">Target Fat</div>
            </div>
          </div>
        </div>

        <div className="weekly-meal-plan">
          <h3>Your 7-Day Meal Plan</h3>
          {days.map((day, index) => {
            const dayPlan = mealPlan[day];
            if (!dayPlan) return null;

            return (
              <div key={day} className="day-plan">
                <h4>{dayNames[index]}</h4>
                <div className="meals-grid">
                  {Object.keys(dayPlan).map(mealType => {
                    const meal = dayPlan[mealType];
                    return (
                      <div key={mealType} className="meal-card">
                        <div className="meal-header">
                          <h5>{mealType.replace('_', ' ')}</h5>
                          <span className="calories-badge">{meal.calories} cal</span>
                        </div>
                        <h6>{meal.name}</h6>
                        <p>{meal.description}</p>
                        <div className="nutrition-info">
                          <div className="nutrition-item">
                            <div>{meal.protein}g</div>
                            <div>Protein</div>
                          </div>
                          <div className="nutrition-item">
                            <div>{meal.carbs}g</div>
                            <div>Carbs</div>
                          </div>
                          <div className="nutrition-item">
                            <div>{meal.fat}g</div>
                            <div>Fat</div>
                          </div>
                        </div>
                        {meal.cookingTime && (
                          <div className="cooking-time">
                            <i className="fas fa-clock"></i> {meal.cookingTime} minutes
                          </div>
                        )}
                        {meal.region && (
                          <div className="cuisine-type">
                            <i className="fas fa-map-marker-alt"></i> {formatOptionText(meal.region)} cuisine
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="meal-planner-page">
      <div className="dashboard-container">
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
              <a href="/meal-planner" className="nav-link active">
                <i className="fas fa-utensils"></i> Meal Planner
              </a>
            </li>
          </ul>
        </div>

        <div className="main-content">
          <div className="page-header">
            <h1 className="page-title">AI Meal Planning & Tracking</h1>
            <div className="ai-badge">
              <i className="fas fa-robot"></i>
              AI-Powered Nutrition
            </div>
          </div>

          {/* Health Assessment Modal */}
          {showAssessment && (
            <div className="modal">
              <div className="modal-content">
                <div className="modal-header">
                  <h2><i className="fas fa-brain"></i> AI Health Assessment</h2>
                  <span className="close" onClick={() => setShowAssessment(false)}>&times;</span>
                </div>
                <div className="modal-body">
                  <div className="assessment-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${((currentQuestion + 1) / healthQuestions.length) * 100}%` }}
                      ></div>
                    </div>
                    <div className="progress-text">
                      <span>{currentQuestion + 1}</span> of <span>{healthQuestions.length}</span> questions
                    </div>
                  </div>
                  
                  <div className="question-container">
                    {healthQuestions[currentQuestion] && (
                      <div className="question">
                        <h3 className="question-title">{healthQuestions[currentQuestion].question}</h3>
                        {healthQuestions[currentQuestion].description && (
                          <p className="question-description">{healthQuestions[currentQuestion].description}</p>
                        )}
                        {renderQuestion(healthQuestions[currentQuestion])}
                      </div>
                    )}
                  </div>
                  
                  <div className="assessment-navigation">
                    <button 
                      className="btn btn-outline" 
                      onClick={previousQuestion}
                      disabled={currentQuestion === 0}
                    >
                      <i className="fas fa-arrow-left"></i> Previous
                    </button>
                    <button 
                      className={`btn ${currentQuestion === healthQuestions.length - 1 ? 'btn-success' : 'btn-primary'}`}
                      onClick={nextQuestion}
                      disabled={loading}
                    >
                      {currentQuestion === healthQuestions.length - 1 ? (
                        <>Generate Meal Plan <i className="fas fa-magic"></i></>
                      ) : (
                        <>Next <i className="fas fa-arrow-right"></i></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Meal Plan Display */}
          {mealPlan && nutritionTargets ? renderMealPlan() : (
            <div className="welcome-section">
              <div className="welcome-card">
                <div className="welcome-header">
                  <div className="ai-avatar">
                    <i className="fas fa-robot"></i>
                  </div>
                  <h2>Welcome to AI Meal Planning!</h2>
                  <p>I'm your personal nutrition AI assistant. Let me create a customized meal plan based on your health profile, goals, regional preferences, and lifestyle.</p>
                </div>
                
                <div className="features-grid">
                  <div className="feature-item">
                    <div className="feature-icon">
                      <i className="fas fa-brain"></i>
                    </div>
                    <h4>Smart Analysis</h4>
                    <p>AI analyzes your health data, medical conditions, regional preferences, and lifestyle</p>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">
                      <i className="fas fa-globe-asia"></i>
                    </div>
                    <h4>Regional Cuisine</h4>
                    <p>Authentic North Indian, South Indian, and regional meal plans tailored to your taste</p>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">
                      <i className="fas fa-utensils"></i>
                    </div>
                    <h4>Personalized Meals</h4>
                    <p>Custom meal plans considering dietary restrictions, cooking time, and budget</p>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">
                      <i className="fas fa-heartbeat"></i>
                    </div>
                    <h4>Health-Focused</h4>
                    <p>Meals designed for specific medical conditions like diabetes, hypertension, and more</p>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">
                      <i className="fas fa-chart-line"></i>
                    </div>
                    <h4>Progress Tracking</h4>
                    <p>Real-time nutrition tracking and goal monitoring with detailed analytics</p>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">
                      <i className="fas fa-shopping-cart"></i>
                    </div>
                    <h4>Smart Shopping</h4>
                    <p>Automated grocery lists with budget optimization and local ingredient suggestions</p>
                  </div>
                </div>
                
                <div className="cta-section">
                  <button 
                    className="btn btn-primary btn-large" 
                    onClick={startHealthAssessment}
                    disabled={loading}
                  >
                    <i className="fas fa-magic"></i> Start Health Assessment
                  </button>
                  <p className="cta-note">Takes 5-7 minutes • Completely personalized • Science-backed • Regional cuisine support</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MealPlanner;