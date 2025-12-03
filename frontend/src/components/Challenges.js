import React, { useState, useEffect } from 'react';
import './Challenges.css';

const Challenges = () => {
  const [currentTab, setCurrentTab] = useState('active');
  const [userStats, setUserStats] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [streaks, setStreaks] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  useEffect(() => {
    loadUserStats();
    loadStreaks();
    loadChallenges('active');
    loadLeaderboard();
  }, []);

  const loadUserStats = async () => {
    try {
      const response = await fetch('/api/challenges/stats');
      const data = await response.json();
      
      if (data.success) {
        setUserStats(data.stats);
      } else {
        setUserStats({
          challengesCompleted: 0,
          currentStreak: 0,
          achievementsUnlocked: 0,
          totalPoints: 0
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setUserStats({
        challengesCompleted: 0,
        currentStreak: 0,
        achievementsUnlocked: 0,
        totalPoints: 0
      });
    }
  };

  const loadChallenges = async (type) => {
    try {
      const response = await fetch(`/api/challenges?type=${type}`);
      const data = await response.json();
      
      if (data.success) {
        setChallenges(data.challenges || []);
      } else {
        setChallenges([]);
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
      setChallenges([]);
    }
  };

  const loadStreaks = async () => {
    try {
      const response = await fetch('/api/streaks/status');
      const data = await response.json();
      
      if (data.success) {
        setStreaks(data.streaks);
      } else {
        setStreaks(null);
      }
    } catch (error) {
      console.error('Error loading streaks:', error);
      setStreaks(null);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch('/api/challenges/leaderboard');
      const data = await response.json();
      
      if (data.success && data.leaderboard.length > 0) {
        setLeaderboard(data.leaderboard);
      } else {
        setLeaderboard([]);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLeaderboard([]);
    }
  };

  const switchTab = (tabName) => {
    setCurrentTab(tabName);
    if (tabName === 'templates') {
      // Templates are handled locally
    } else {
      loadChallenges(tabName);
    }
  };

  const joinChallenge = async (challengeId) => {
    try {
      const response = await fetch(`/api/challenges/${challengeId}/join`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        showNotification('Successfully joined challenge!', 'success');
        loadChallenges(currentTab);
        loadUserStats();
      } else {
        showNotification(data.error, 'error');
      }
    } catch (error) {
      console.error('Join challenge error:', error);
      showNotification('Failed to join challenge', 'error');
    }
  };

  const logProgress = async (challengeId, challengeType) => {
    const progress = prompt(`Enter your progress (e.g., number of reps, minutes, glasses):`);
    if (!progress || isNaN(progress)) return;
    
    try {
      const response = await fetch(`/api/challenges/${challengeId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: parseFloat(progress) })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('Progress logged successfully!', 'success');
        
        if (data.milestone) {
          celebrateProgress(data.milestone);
        }
        
        loadChallenges(currentTab);
        loadUserStats();
      } else {
        showNotification(data.error, 'error');
      }
    } catch (error) {
      console.error('Log progress error:', error);
      showNotification('Failed to log progress', 'error');
    }
  };

  const createQuickChallenge = (type) => {
    const templates = {
      '7-day-water': {
        title: '7-Day Water Challenge',
        description: 'Drink 8 glasses of water daily',
        type: 'habit',
        category: 'hydration',
        target: { value: 56, unit: 'glasses' },
        duration: { value: 7, unit: 'days' },
        points: 140
      },
      'push-up-week': {
        title: 'Push-up Week',
        description: 'Do push-ups every day for a week',
        type: 'workout',
        category: 'strength',
        target: { value: 7, unit: 'workouts' },
        duration: { value: 7, unit: 'days' },
        points: 200
      },
      '10k-steps': {
        title: '10K Steps Challenge',
        description: 'Walk 10,000 steps daily for a week',
        type: 'habit',
        category: 'cardio',
        target: { value: 70000, unit: 'steps' },
        duration: { value: 7, unit: 'days' },
        points: 180
      }
    };
    
    const template = templates[type];
    if (template) {
      setShowCreateModal(true);
      // In a real app, you'd pre-fill the form with template data
    }
  };

  const showNotification = (message, type = 'info') => {
    // Simple notification - you can enhance this with a proper toast library
    alert(message);
  };

  const celebrateProgress = (milestone) => {
    // Simple celebration - you can enhance this with animations
    setTimeout(() => {
      showNotification(`🎉 Milestone reached: ${milestone}!`, 'success');
    }, 500);
  };

  const getStreakStatusText = (status) => {
    switch(status) {
      case 'active': return '✅ On track!';
      case 'at-risk': return '⚠️ Don\'t break it!';
      case 'broken': return '💔 Streak broken';
      case 'inactive': return '😴 Not started';
      default: return 'Unknown';
    }
  };

  const templates = [
    {
      title: '7-Day Water Challenge',
      description: 'Drink 8 glasses of water daily for a week',
      type: 'habit',
      category: 'hydration',
      difficulty: 'beginner',
      target: { value: 56, unit: 'glasses' },
      duration: { value: 7, unit: 'days' },
      points: 140
    },
    {
      title: 'Push-up Week Challenge',
      description: 'Complete push-ups every day for 7 days',
      type: 'workout',
      category: 'strength',
      difficulty: 'intermediate',
      target: { value: 7, unit: 'workouts' },
      duration: { value: 7, unit: 'days' },
      points: 200
    },
    {
      title: '10K Steps Daily',
      description: 'Walk 10,000 steps every day for a week',
      type: 'habit',
      category: 'cardio',
      difficulty: 'intermediate',
      target: { value: 70000, unit: 'steps' },
      duration: { value: 7, unit: 'days' },
      points: 180
    },
    {
      title: 'Healthy Meals Week',
      description: 'Log 3 healthy meals daily for 7 days',
      type: 'nutrition',
      category: 'nutrition',
      difficulty: 'beginner',
      target: { value: 21, unit: 'meals' },
      duration: { value: 7, unit: 'days' },
      points: 160
    }
  ];

  const filteredChallenges = challenges.filter(challenge => {
    const matchesSearch = challenge.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = !difficultyFilter || challenge.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  const displayData = currentTab === 'templates' ? templates : filteredChallenges;

  return (
    <div className="challenges-page">
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
              <a href="/challenges" className="nav-link active">
                <i className="fas fa-trophy"></i> Challenges
              </a>
            </li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <div className="page-header">
            <h1 className="page-title">Challenges & Achievements</h1>
            <div>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <i className="fas fa-plus"></i> Create Challenge
              </button>
            </div>
          </div>
          
          {/* Stats Overview */}
          <div className="stats-overview">
            <div className="stat-card">
              <div className="stat-icon gold">
                <i className="fas fa-trophy"></i>
              </div>
              <div className="stat-value">{userStats?.challengesCompleted || 0}</div>
              <div className="stat-label">Challenges Completed</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon primary">
                <i className="fas fa-fire"></i>
              </div>
              <div className="stat-value">{userStats?.currentStreak || 0}</div>
              <div className="stat-label">Day Streak</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon bronze">
                <i className="fas fa-medal"></i>
              </div>
              <div className="stat-value">{userStats?.achievementsUnlocked || 0}</div>
              <div className="stat-label">Achievements Unlocked</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon silver">
                <i className="fas fa-star"></i>
              </div>
              <div className="stat-value">{userStats?.totalPoints?.toLocaleString() || 0}</div>
              <div className="stat-label">Points Earned</div>
            </div>
          </div>

          {/* Streaks Section */}
          <div className="challenges-section" style={{marginBottom: '2rem'}}>
            <div className="section-header">
              <h2 className="section-title">🔥 Your Streaks</h2>
              <button className="btn btn-outline btn-small" onClick={loadStreaks}>Refresh</button>
            </div>
            
            {!streaks ? (
              <div className="empty-state">
                <i className="fas fa-fire" style={{fontSize: '2rem', color: 'var(--gray)', marginBottom: '1rem'}}></i>
                <p>Start logging workouts and nutrition to build your streaks!</p>
              </div>
            ) : (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
                <div className="streak-card">
                  <div className="streak-header">
                    <div className="streak-icon" style={{background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)'}}>
                      <i className="fas fa-dumbbell"></i>
                    </div>
                    <div>
                      <h4>Workout Streak</h4>
                      <p className={`streak-status ${streaks.workout?.status}`}>
                        {getStreakStatusText(streaks.workout?.status)}
                      </p>
                    </div>
                  </div>
                  <div className="streak-stats">
                    <div className="streak-current">
                      <span className="streak-number">{streaks.workout?.current || 0}</span>
                      <span className="streak-emoji">{streaks.workout?.emoji || '🔥'}</span>
                    </div>
                    <div className="streak-details">
                      <p>Current: {streaks.workout?.current || 0} days</p>
                      <p>Best: {streaks.workout?.longest || 0} days</p>
                      <p>Next milestone: {streaks.workout?.nextMilestone || 7} days</p>
                    </div>
                  </div>
                </div>
                
                <div className="streak-card">
                  <div className="streak-header">
                    <div className="streak-icon" style={{background: 'linear-gradient(135deg, #4ECDC4, #44A08D)'}}>
                      <i className="fas fa-utensils"></i>
                    </div>
                    <div>
                      <h4>Nutrition Streak</h4>
                      <p className={`streak-status ${streaks.nutrition?.status}`}>
                        {getStreakStatusText(streaks.nutrition?.status)}
                      </p>
                    </div>
                  </div>
                  <div className="streak-stats">
                    <div className="streak-current">
                      <span className="streak-number">{streaks.nutrition?.current || 0}</span>
                      <span className="streak-emoji">{streaks.nutrition?.emoji || '🥗'}</span>
                    </div>
                    <div className="streak-details">
                      <p>Current: {streaks.nutrition?.current || 0} days</p>
                      <p>Best: {streaks.nutrition?.longest || 0} days</p>
                      <p>Next milestone: {streaks.nutrition?.nextMilestone || 7} days</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="content-grid">
            <div className="challenges-section">
              <div className="section-header">
                <h2 className="section-title">Challenges</h2>
              </div>
              
              <div className="challenge-tabs">
                {['active', 'suggested', 'completed', 'templates'].map(tab => (
                  <button 
                    key={tab}
                    className={`tab-btn ${currentTab === tab ? 'active' : ''}`}
                    onClick={() => switchTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              
              <div style={{display: 'flex', gap: '10px', marginBottom: '1rem'}}>
                <input 
                  type="text" 
                  placeholder="Search challenges..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{flex: 1, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', color: 'white'}}
                />
                <select 
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  style={{padding: '8px 12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', color: 'white'}}
                >
                  <option value="">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              
              <div className="challenges-container">
                {displayData.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-trophy" style={{fontSize: '3rem', color: 'var(--gray)', marginBottom: '1rem'}}></i>
                    <h3>No {currentTab} challenges</h3>
                    <p>{currentTab === 'active' ? 'Join some challenges to get started!' : 'Check back later for new challenges.'}</p>
                  </div>
                ) : (
                  displayData.map((challenge, index) => (
                    <div key={challenge._id || index} className="challenge-card">
                      <div className="challenge-header">
                        <div className="challenge-info">
                          <h3>{challenge.title}</h3>
                          <div className="challenge-meta">
                            {challenge.daysLeft && <span><i className="fas fa-clock"></i> {challenge.daysLeft}d left</span>}
                            <span><i className="fas fa-users"></i> {challenge.participantCount || 0}</span>
                            <span className={`difficulty-badge difficulty-${challenge.difficulty}`}>
                              {challenge.difficulty}
                            </span>
                          </div>
                        </div>
                        <div className={`challenge-badge badge-${currentTab === 'suggested' ? 'upcoming' : currentTab}`}>
                          {currentTab === 'suggested' ? 'Suggested' : currentTab === 'completed' ? 'Completed' : currentTab === 'templates' ? 'Template' : 'Active'}
                        </div>
                      </div>
                      
                      <p>{challenge.description}</p>
                      
                      <div className="challenge-reward">
                        <i className="fas fa-gift reward-icon"></i>
                        <span>Reward: {challenge.rewards?.points || challenge.points || 100} points + Badge</span>
                      </div>
                      
                      <div style={{marginTop: '1rem', display: 'flex', gap: '10px'}}>
                        {currentTab === 'active' ? (
                          <>
                            <button className="btn btn-success btn-small" onClick={() => logProgress(challenge._id, challenge.type)}>
                              Log Progress
                            </button>
                            <button className="btn btn-outline btn-small">Share</button>
                          </>
                        ) : currentTab === 'completed' ? (
                          <>
                            <button className="btn btn-outline btn-small">View Stats</button>
                            <button className="btn btn-outline btn-small">Share</button>
                          </>
                        ) : currentTab === 'templates' ? (
                          <>
                            <button className="btn btn-primary btn-small" onClick={() => createQuickChallenge('template-' + index)}>
                              Use Template
                            </button>
                            <button className="btn btn-outline btn-small">Customize</button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-primary btn-small" onClick={() => joinChallenge(challenge._id)}>
                              Join Challenge
                            </button>
                            <button className="btn btn-outline btn-small">Preview</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="achievements-sidebar">
              <h3 className="section-title">Leaderboard</h3>
              <div className="leaderboard">
                {leaderboard.length === 0 ? (
                  <div style={{textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.7)'}}>
                    <i className="fas fa-trophy" style={{fontSize: '2rem', marginBottom: '10px', opacity: 0.5}}></i>
                    <p>Start completing challenges to see the leaderboard!</p>
                  </div>
                ) : (
                  leaderboard.map((user, index) => (
                    <div key={index} className="leaderboard-item">
                      <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <span style={{color: index < 3 ? (index === 0 ? 'var(--gold)' : index === 1 ? 'var(--silver)' : 'var(--bronze)') : 'white'}}>
                          {index < 3 ? (index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉') : user.rank + '.'}
                        </span>
                        <span>{user.name}</span>
                      </div>
                      <span style={{fontWeight: 600}}>{user.points.toLocaleString()} pts</span>
                    </div>
                  ))
                )}
              </div>
              
              <div style={{marginTop: '2rem'}}>
                <h4>Quick Templates</h4>
                <div className="quick-actions-sidebar">
                  <button className="action-btn-small" onClick={() => createQuickChallenge('7-day-water')}>
                    <i className="fas fa-tint"></i> 7-Day Water
                  </button>
                  <button className="action-btn-small" onClick={() => createQuickChallenge('push-up-week')}>
                    <i className="fas fa-dumbbell"></i> Push-up Week
                  </button>
                  <button className="action-btn-small" onClick={() => createQuickChallenge('10k-steps')}>
                    <i className="fas fa-walking"></i> 10K Steps
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Challenge Modal */}
      {showCreateModal && (
        <div className="modal" style={{display: 'block'}}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create New Challenge</h3>
              <span className="close" onClick={() => setShowCreateModal(false)}>&times;</span>
            </div>
            <div style={{padding: '25px'}}>
              <p>Challenge creation form would go here...</p>
              <div className="form-actions">
                <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="btn btn-primary">Create Challenge</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Challenges;