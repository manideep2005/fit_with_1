import React, { useState, useEffect } from 'react';
import './Progress.css';

const Progress = () => {
  const [activeTimeFilter, setActiveTimeFilter] = useState('Today');
  const [progressData, setProgressData] = useState({
    caloriesBurned: 2845,
    activeMinutes: 87,
    steps: 8742,
    fitnessScore: 78
  });

  const timeFilters = ['Today', 'Week', 'Month', '3 Months', 'Year', 'All Time'];

  const workoutProgress = [
    { exercise: 'Bench Press', lastWeek: '135 lbs x 8', thisWeek: '145 lbs x 8', change: '+10 lbs', status: 'Excellent', statusClass: 'badge-success' },
    { exercise: 'Squats', lastWeek: '185 lbs x 6', thisWeek: '195 lbs x 5', change: '+10 lbs', status: 'Good', statusClass: 'badge-success' },
    { exercise: 'Pull-ups', lastWeek: '8 reps', thisWeek: '10 reps', change: '+2 reps', status: 'Improved', statusClass: 'badge-success' },
    { exercise: 'Running Pace', lastWeek: '8:30 min/mile', thisWeek: '8:45 min/mile', change: '-0:15', status: 'Needs work', statusClass: 'badge-warning' },
    { exercise: 'Plank Time', lastWeek: '2:30', thisWeek: '2:15', change: '-0:15', status: 'Declined', statusClass: 'badge-danger' }
  ];

  useEffect(() => {
    // Load progress data based on selected time filter
    loadProgressData(activeTimeFilter);
  }, [activeTimeFilter]);

  const loadProgressData = (timeFilter) => {
    // Simulate loading data for different time periods
    console.log(`Loading data for: ${timeFilter}`);
    // In real app, this would fetch from API
  };

  const exportData = () => {
    alert('Exporting progress data...');
    // In real app, this would generate and download a report
  };

  const addMeasurement = () => {
    alert('Add measurement modal would open here');
    // In real app, this would open a modal to add body measurements
  };

  return (
    <div className="progress-page">
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
              <a href="/nutrition" className="nav-link">
                <i className="fas fa-utensils"></i> Nutrition
              </a>
            </li>
            <li className="nav-item">
              <a href="/progress" className="nav-link active">
                <i className="fas fa-chart-line"></i> Progress
              </a>
            </li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <div className="page-header">
            <h1 className="page-title">Your Progress</h1>
            <div>
              <button className="btn btn-primary" onClick={exportData}>
                <i className="fas fa-download"></i> Export Data
              </button>
            </div>
          </div>
          
          <div className="time-filters">
            {timeFilters.map(filter => (
              <div 
                key={filter}
                className={`time-filter ${activeTimeFilter === filter ? 'active' : ''}`}
                onClick={() => setActiveTimeFilter(filter)}
              >
                {filter}
              </div>
            ))}
          </div>
          
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Calories Burned</div>
              <div className="stat-value">{progressData.caloriesBurned.toLocaleString()}</div>
              <div className="stat-change up">
                <i className="fas fa-arrow-up"></i> 15% from last week
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Active Minutes</div>
              <div className="stat-value">{progressData.activeMinutes}</div>
              <div className="stat-change up">
                <i className="fas fa-arrow-up"></i> 23% from last week
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Steps</div>
              <div className="stat-value">{progressData.steps.toLocaleString()}</div>
              <div className="stat-change up">
                <i className="fas fa-arrow-up"></i> 8% from last week
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Fitness Score</div>
              <div className="stat-value">{progressData.fitnessScore}</div>
              <div className="stat-change up">
                <i className="fas fa-arrow-up"></i> 5 points this month
              </div>
            </div>
          </div>
          
          <div className="progress-card">
            <div className="card-header">
              <h2 className="card-title">Weekly Activity Overview</h2>
              <div>
                <select className="form-control" style={{width: 'auto', display: 'inline-block'}}>
                  <option>Calories</option>
                  <option>Steps</option>
                  <option>Active Minutes</option>
                  <option>Workouts</option>
                </select>
              </div>
            </div>
            
            <div className="chart-container">
              <div className="chart-placeholder">
                📊 Activity Chart
                <p>Weekly activity data visualization would appear here</p>
              </div>
            </div>
          </div>
          
          <div className="progress-card">
            <div className="card-header">
              <h2 className="card-title">Workout Progress</h2>
            </div>
            
            <table className="progress-table">
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th>Last Week</th>
                  <th>This Week</th>
                  <th>Change</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {workoutProgress.map((workout, index) => (
                  <tr key={index}>
                    <td>{workout.exercise}</td>
                    <td>{workout.lastWeek}</td>
                    <td>{workout.thisWeek}</td>
                    <td>{workout.change}</td>
                    <td>
                      <span className={`progress-badge ${workout.statusClass}`}>
                        {workout.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="progress-card">
            <div className="card-header">
              <h2 className="card-title">Body Measurements</h2>
              <div>
                <button className="btn btn-outline" onClick={addMeasurement}>
                  <i className="fas fa-plus"></i> Add Measurement
                </button>
              </div>
            </div>
            
            <div className="chart-container">
              <div className="chart-placeholder">
                📈 Body Measurements Chart
                <p>Weight and body composition trends would appear here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Progress;