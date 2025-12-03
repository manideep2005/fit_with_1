import React, { useState, useEffect } from 'react';
import './Workouts.css';

const Workouts = () => {
  const [workouts, setWorkouts] = useState([]);
  const [filteredWorkouts, setFilteredWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [gamificationData, setGamificationData] = useState({});
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    loadGamificationData();
    loadWorkouts();
  }, []);

  const loadGamificationData = async () => {
    try {
      const response = await fetch('/api/gamification-data');
      const result = await response.json();
      
      if (result.success) {
        setGamificationData(result.data);
      } else {
        setGamificationData({
          level: 1,
          totalXP: 0,
          progressToNextLevel: 0,
          streaks: { workout: { current: 0 } }
        });
      }
    } catch (error) {
      console.error('Error loading gamification data:', error);
    }
  };

  const loadWorkouts = () => {
    setLoading(true);
    const defaultWorkouts = getDefaultWorkouts();
    setWorkouts(defaultWorkouts);
    setFilteredWorkouts(defaultWorkouts);
    setLoading(false);
  };

  const getDefaultWorkouts = () => {
    const templates = [
      { name: "HIIT Blast", category: "hiit", baseCalories: 400, baseDuration: 30 },
      { name: "Strength Builder", category: "strength", baseCalories: 320, baseDuration: 45 },
      { name: "Yoga Flow", category: "yoga", baseCalories: 150, baseDuration: 25 },
      { name: "Dance Party", category: "dance", baseCalories: 450, baseDuration: 35 },
      { name: "Core Crusher", category: "strength", baseCalories: 200, baseDuration: 20 },
      { name: "Pilates Power", category: "pilates", baseCalories: 280, baseDuration: 60 },
      { name: "Cardio Burn", category: "cardio", baseCalories: 380, baseDuration: 40 },
      { name: "Flexibility Focus", category: "yoga", baseCalories: 120, baseDuration: 30 }
    ];
    
    const difficulties = ['beginner', 'intermediate', 'advanced'];
    const bodyParts = ['Full Body', 'Upper Body', 'Lower Body', 'Core'];
    const timeVars = ['Morning', 'Evening', 'Quick', 'Power', 'Intense'];
    
    return templates.map((template, index) => {
      const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
      const bodyPart = bodyParts[Math.floor(Math.random() * bodyParts.length)];
      const timeVar = timeVars[Math.floor(Math.random() * timeVars.length)];
      
      const multiplier = difficulty === 'beginner' ? 0.8 : difficulty === 'advanced' ? 1.3 : 1.1;
      const duration = Math.round(template.baseDuration * multiplier);
      const calories = Math.round(template.baseCalories * multiplier);
      
      return {
        id: index + 1,
        title: `${timeVar} ${bodyPart} ${template.name}`,
        duration: `${duration} min`,
        calories: `${calories} cal`,
        difficulty: difficulty,
        category: template.category,
        description: `Dynamic ${template.category} workout targeting ${bodyPart.toLowerCase()} for ${difficulty} level fitness enthusiasts.`,
        image: `https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400`,
        xpReward: Math.round(duration * 2 + (difficulty === 'advanced' ? 20 : 10)),
        exercises: generateExercises(template.category, difficulty),
        targetMuscles: getTargetMuscles(template.category)
      };
    });
  };

  const generateExercises = (category, difficulty) => {
    const exerciseBank = {
      hiit: ['Burpees', 'Mountain Climbers', 'Jump Squats', 'High Knees', 'Plank Jacks'],
      strength: ['Push-ups', 'Squats', 'Deadlifts', 'Pull-ups', 'Bench Press'],
      yoga: ['Downward Dog', 'Warrior Pose', 'Tree Pose', 'Sun Salutation'],
      cardio: ['Running', 'Cycling', 'Jumping Jacks', 'Step-ups'],
      dance: ['Hip Hop', 'Salsa', 'Zumba', 'Jazz Moves'],
      pilates: ['Hundred', 'Roll Up', 'Teaser', 'Plank']
    };
    
    const exercises = exerciseBank[category] || exerciseBank.hiit;
    const count = difficulty === 'beginner' ? 4 : difficulty === 'advanced' ? 7 : 5;
    return exercises.slice(0, count);
  };

  const getTargetMuscles = (category) => {
    const muscles = {
      hiit: ['Full Body', 'Core', 'Legs'],
      strength: ['Chest', 'Back', 'Arms'],
      yoga: ['Flexibility', 'Balance', 'Core'],
      cardio: ['Heart', 'Legs', 'Endurance'],
      dance: ['Coordination', 'Legs', 'Core'],
      pilates: ['Core', 'Posture', 'Stability']
    };
    return muscles[category] || muscles.hiit;
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query === '') {
      setFilteredWorkouts(workouts);
    } else {
      const filtered = workouts.filter(workout => 
        workout.title.toLowerCase().includes(query.toLowerCase()) ||
        workout.description.toLowerCase().includes(query.toLowerCase()) ||
        workout.category.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredWorkouts(filtered);
    }
  };

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    if (category === 'all') {
      setFilteredWorkouts(workouts);
    } else {
      setFilteredWorkouts(workouts.filter(workout => workout.category === category));
    }
  };

  const startWorkout = (workoutId) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (workout) {
      setCurrentWorkout(workout);
      setShowWorkoutModal(true);
    }
  };

  const completeWorkout = async () => {
    if (!currentWorkout) return;
    
    try {
      const workoutData = {
        type: currentWorkout.title,
        duration: parseInt(currentWorkout.duration),
        calories: parseInt(currentWorkout.calories),
        notes: `Completed ${currentWorkout.title}`,
        source: 'app'
      };
      
      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workoutData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`Workout completed! +${currentWorkout.xpReward} XP earned! 🎉`);
        setShowWorkoutModal(false);
        loadGamificationData();
      } else {
        alert('Failed to log workout: ' + result.error);
      }
    } catch (error) {
      console.error('Error completing workout:', error);
      alert('Error completing workout. Please try again.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="workouts-loading">
        <div className="loading-spinner"></div>
        <p>Loading workouts...</p>
      </div>
    );
  }

  return (
    <div className="workouts-page">
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
              <a href="/workouts" className="nav-link active">
                <i className="fas fa-dumbbell"></i> Workouts
              </a>
            </li>
            <li className="nav-item">
              <a href="/nutrition" className="nav-link">
                <i className="fas fa-utensils"></i> Nutrition
              </a>
            </li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <div className="page-header">
            <h1 className="page-title">Workouts</h1>
            <div className="header-actions">
              <div className="search-container">
                <i className="fas fa-search search-icon"></i>
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Search workouts..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Gamification Stats Bar */}
          <div className="gamification-bar">
            <div className="gamification-stats">
              <div className="stat-item">
                <div className="stat-icon">🏆</div>
                <div className="stat-info">
                  <div className="stat-label">Level</div>
                  <div className="stat-value">{gamificationData.level || 1}</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">⚡</div>
                <div className="stat-info">
                  <div className="stat-label">XP</div>
                  <div className="stat-value">{(gamificationData.totalXP || 0).toLocaleString()}</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">🔥</div>
                <div className="stat-info">
                  <div className="stat-label">Streak</div>
                  <div className="stat-value">{gamificationData.streaks?.workout?.current || 0}</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">🎯</div>
                <div className="stat-info">
                  <div className="stat-label">Today's Goal</div>
                  <div className="stat-value">0/1</div>
                </div>
              </div>
            </div>
            <div className="xp-progress">
              <div 
                className="xp-progress-bar" 
                style={{width: `${gamificationData.progressToNextLevel || 0}%`}}
              ></div>
              <div className="xp-progress-text">
                {gamificationData.xpToNextLevel || 0} XP to next level
              </div>
            </div>
          </div>
          
          {/* Category Tabs */}
          <div className="category-tabs">
            {['all', 'strength', 'cardio', 'hiit', 'yoga', 'pilates', 'dance'].map(category => (
              <button 
                key={category}
                className={`category-tab ${activeCategory === category ? 'active' : ''}`}
                onClick={() => handleCategoryChange(category)}
              >
                {category === 'all' ? 'All Workouts' : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Quick Actions */}
          <div className="quick-actions">
            <button className="btn btn-outline" onClick={() => setShowTimerModal(true)}>
              <i className="fas fa-stopwatch"></i>
              <span>Workout Timer</span>
            </button>
          </div>
          
          {/* Workout Grid */}
          <div className="workout-grid">
            {filteredWorkouts.map((workout) => (
              <div key={workout.id} className="workout-card">
                <div className="workout-image" style={{backgroundImage: `url(${workout.image})`}}>
                  <div className="xp-reward">⚡ +{workout.xpReward} XP</div>
                  <div className="play-overlay">
                    <i className="fas fa-dumbbell"></i>
                  </div>
                </div>
                <div className="workout-content">
                  <h3 className="workout-title">{workout.title}</h3>
                  <div className="workout-meta">
                    <span><i className="far fa-clock"></i> {workout.duration}</span>
                    <span><i className="fas fa-fire"></i> {workout.calories}</span>
                    <span><i className="fas fa-list"></i> {workout.exercises.length} exercises</span>
                  </div>
                  <p className="workout-description">{workout.description}</p>
                  <div className="workout-footer">
                    <span className={`difficulty-badge difficulty-${workout.difficulty}`}>
                      {workout.difficulty}
                    </span>
                    <button className="start-btn" onClick={() => startWorkout(workout.id)}>
                      Start Workout
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workout Modal */}
      {showWorkoutModal && currentWorkout && (
        <div className="video-modal active">
          <div className="video-container">
            <div className="video-header">
              <h2 className="video-title">{currentWorkout.title}</h2>
              <button className="close-btn" onClick={() => setShowWorkoutModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{padding: '30px'}}>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px', textAlign: 'center'}}>
                <div style={{background: 'rgba(108, 99, 255, 0.2)', padding: '15px', borderRadius: '12px'}}>
                  <div style={{color: 'var(--primary)', fontSize: '1.5rem', fontWeight: '600'}}>{currentWorkout.duration}</div>
                  <div style={{color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem'}}>Duration</div>
                </div>
                <div style={{background: 'rgba(255, 101, 132, 0.2)', padding: '15px', borderRadius: '12px'}}>
                  <div style={{color: 'var(--accent)', fontSize: '1.5rem', fontWeight: '600'}}>{currentWorkout.calories}</div>
                  <div style={{color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem'}}>Calories</div>
                </div>
                <div style={{background: 'rgba(40, 167, 69, 0.2)', padding: '15px', borderRadius: '12px'}}>
                  <div style={{color: 'var(--success)', fontSize: '1.5rem', fontWeight: '600'}}>{currentWorkout.exercises.length}</div>
                  <div style={{color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem'}}>Exercises</div>
                </div>
              </div>
              
              <div style={{maxHeight: '250px', overflowY: 'auto', marginBottom: '20px'}}>
                <h3 style={{color: 'white', marginBottom: '15px'}}>Exercise List:</h3>
                {currentWorkout.exercises.map((exercise, index) => (
                  <div key={index} style={{background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <div style={{background: 'var(--primary)', color: 'white', width: '25px', height: '25px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '600'}}>{index + 1}</div>
                    <div style={{flex: 1, color: 'white'}}>{exercise}</div>
                    <div style={{color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem'}}>3 sets</div>
                  </div>
                ))}
              </div>
              
              <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
                <button className="control-btn" onClick={() => setShowTimerModal(true)}>
                  <i className="fas fa-stopwatch"></i>
                  <span>Start Timer</span>
                </button>
                <button className="control-btn primary" onClick={completeWorkout}>
                  <i className="fas fa-check"></i>
                  <span>Complete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timer Modal */}
      {showTimerModal && (
        <div className="video-modal active">
          <div className="video-container">
            <div className="video-header">
              <h2 className="video-title">Workout Timer</h2>
              <button className="close-btn" onClick={() => setShowTimerModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="timer-content">
              <div className="timer-display">{formatTime(timerSeconds)}</div>
              <div className="timer-controls">
                <button className="control-btn" onClick={() => {
                  if (!isTimerRunning) {
                    const interval = setInterval(() => {
                      setTimerSeconds(prev => prev + 1);
                    }, 1000);
                    setIsTimerRunning(true);
                  }
                }}>
                  <i className="fas fa-play"></i>
                  <span>Start</span>
                </button>
                <button className="control-btn" onClick={() => setIsTimerRunning(false)}>
                  <i className="fas fa-pause"></i>
                  <span>Pause</span>
                </button>
                <button className="control-btn" onClick={() => {
                  setTimerSeconds(0);
                  setIsTimerRunning(false);
                }}>
                  <i className="fas fa-redo"></i>
                  <span>Reset</span>
                </button>
              </div>
              <div className="timer-presets">
                {[300, 900, 1800, 2700, 3600].map(time => (
                  <button 
                    key={time}
                    className="preset-btn" 
                    onClick={() => setTimerSeconds(time)}
                  >
                    {time / 60} min
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workouts;