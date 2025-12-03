import React, { useState, useEffect } from 'react';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('Account');
  const [user, setUser] = useState({
    fullName: 'John Doe',
    email: 'john@example.com',
    fitnessId: 'FIT123456',
    profilePhoto: null
  });
  const [preferences, setPreferences] = useState({
    theme: 'dark',
    language: 'en',
    units: 'metric',
    timeFormat: '12',
    autoRestTimer: true,
    defaultRestTime: 90
  });
  const [notifications, setNotifications] = useState({
    workoutReminders: true,
    progressUpdates: true,
    challengeNotifications: false,
    socialUpdates: false
  });

  const tabs = ['Account', 'Preferences', 'Notifications', 'Security', 'Subscription', 'Advanced'];

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      const result = await response.json();
      if (result.success) {
        showNotification('Profile updated successfully!', 'success');
      } else {
        showNotification('Update failed: ' + result.error, 'error');
      }
    } catch (error) {
      showNotification('Network error', 'error');
    }
  };

  const updatePreference = async (key, value) => {
    try {
      const response = await fetch('/api/settings/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      });
      const result = await response.json();
      if (result.success) {
        setPreferences(prev => ({ ...prev, [key]: value }));
        showNotification('Preference updated', 'success');
      }
    } catch (error) {
      showNotification('Update failed', 'error');
    }
  };

  const updateNotification = async (key, value) => {
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      });
      const result = await response.json();
      if (result.success) {
        setNotifications(prev => ({ ...prev, [key]: value }));
        showNotification('Notification setting updated', 'success');
      }
    } catch (error) {
      showNotification('Update failed', 'error');
    }
  };

  const showNotification = (message, type) => {
    alert(message); // Simple notification - can be enhanced
  };

  const copyFitnessId = () => {
    navigator.clipboard.writeText(user.fitnessId);
    showNotification('Fitness ID copied!', 'success');
  };

  const exportData = async () => {
    try {
      const response = await fetch('/api/settings/export-data');
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fit-with-ai-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Data exported successfully!', 'success');
      }
    } catch (error) {
      showNotification('Export failed', 'error');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Account':
        return (
          <div>
            <div className="settings-card">
              <div className="card-header">
                <h2 className="card-title">Profile Information</h2>
                <span className="badge badge-success">Active</span>
              </div>
              <form onSubmit={updateProfile}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={user.fullName}
                    onChange={(e) => setUser(prev => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={user.email}
                    onChange={(e) => setUser(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fitness ID</label>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <input type="text" className="form-control" value={user.fitnessId} readOnly />
                    <button type="button" className="btn btn-outline" onClick={copyFitnessId}>
                      <i className="fas fa-copy"></i> Copy
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </form>
            </div>

            <div className="settings-card">
              <div className="card-header">
                <h2 className="card-title">Connected Accounts</h2>
              </div>
              <div className="connected-account">
                <div className="account-info">
                  <div className="account-icon google">
                    <i className="fab fa-google"></i>
                  </div>
                  <div>
                    <h4>Google</h4>
                    <small>Connected for authentication</small>
                  </div>
                </div>
                <button className="btn btn-outline">Disconnect</button>
              </div>
            </div>
          </div>
        );

      case 'Preferences':
        return (
          <div className="settings-card">
            <div className="card-header">
              <h2 className="card-title">App Preferences</h2>
            </div>
            <div className="form-group">
              <label className="form-label">Theme</label>
              <select 
                className="form-control" 
                value={preferences.theme}
                onChange={(e) => updatePreference('theme', e.target.value)}
              >
                <option value="dark">Dark Theme</option>
                <option value="light">Light Theme</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Units</label>
              <select 
                className="form-control"
                value={preferences.units}
                onChange={(e) => updatePreference('units', e.target.value)}
              >
                <option value="metric">Metric (kg, cm)</option>
                <option value="imperial">Imperial (lbs, ft)</option>
              </select>
            </div>
            <div className="toggle-group">
              <div className="toggle-item">
                <div>
                  <h4>Auto-start Rest Timer</h4>
                  <small>Automatically start rest timer after each set</small>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={preferences.autoRestTimer}
                    onChange={(e) => updatePreference('autoRestTimer', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'Notifications':
        return (
          <div className="settings-card">
            <div className="card-header">
              <h2 className="card-title">Push Notifications</h2>
            </div>
            <div className="toggle-group">
              <div className="toggle-item">
                <div>
                  <h4>Workout Reminders</h4>
                  <small>Get reminded about your scheduled workouts</small>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={notifications.workoutReminders}
                    onChange={(e) => updateNotification('workoutReminders', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="toggle-item">
                <div>
                  <h4>Progress Updates</h4>
                  <small>Weekly progress summaries and achievements</small>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={notifications.progressUpdates}
                    onChange={(e) => updateNotification('progressUpdates', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'Security':
        return (
          <div className="settings-card">
            <div className="card-header">
              <h2 className="card-title">Account Security</h2>
            </div>
            <div className="security-item">
              <div>
                <h4>Two-Factor Authentication</h4>
                <small>Add an extra layer of security</small>
              </div>
              <button className="btn btn-outline">Enable</button>
            </div>
            <div className="security-item">
              <div>
                <h4>Password</h4>
                <small>Last changed 3 months ago</small>
              </div>
              <button className="btn btn-outline">Change</button>
            </div>
          </div>
        );

      case 'Subscription':
        return (
          <div>
            <div className="current-plan">
              <div className="plan-name">Free Plan</div>
              <div className="plan-price">$0/month</div>
              <ul className="plan-features">
                <li>Basic workout tracking</li>
                <li>Limited nutrition logging</li>
                <li>Basic progress charts</li>
              </ul>
              <button className="btn btn-primary">Upgrade Plan</button>
            </div>
          </div>
        );

      case 'Advanced':
        return (
          <div className="settings-card">
            <div className="card-header">
              <h2 className="card-title">Data Management</h2>
            </div>
            <div className="advanced-item">
              <div>
                <h4>Export Data</h4>
                <small>Download all your fitness data</small>
              </div>
              <button className="btn btn-outline" onClick={exportData}>
                <i className="fas fa-download"></i> Export
              </button>
            </div>
            <div className="advanced-item danger">
              <div>
                <h4>Delete Account</h4>
                <small>Permanently delete your account and all data</small>
              </div>
              <button className="btn btn-danger">Delete Account</button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="settings-page">
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
              <a href="/settings" className="nav-link active">
                <i className="fas fa-cog"></i> Settings
              </a>
            </li>
          </ul>
        </div>

        <div className="main-content">
          <div className="page-header">
            <h1 className="page-title">Settings</h1>
            <button className="btn btn-outline" onClick={exportData}>
              <i className="fas fa-download"></i> Export Data
            </button>
          </div>
          
          <div className="settings-tabs">
            {tabs.map(tab => (
              <div 
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </div>
            ))}
          </div>
          
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;