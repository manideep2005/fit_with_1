import React from 'react';
import { motion } from 'framer-motion';
import './Sidebar.css';

const Sidebar = ({ user, currentPage = 'dashboard' }) => {
  const navigationItems = [
    { id: 'dashboard', icon: 'fas fa-tachometer-alt', label: 'Dashboard', path: '/dashboard' },
    { id: 'workouts', icon: 'fas fa-dumbbell', label: 'Workouts', path: '/workouts' },
    { id: 'nutrition', icon: 'fas fa-utensils', label: 'Nutrition', path: '/nutrition' },
    { id: 'progress', icon: 'fas fa-chart-line', label: 'Progress', path: '/progress' },
    { id: 'ai-coach', icon: 'fas fa-robot', label: 'AI Coach', path: '/ai-coach' },
    { id: 'community', icon: 'fas fa-users', label: 'Community', path: '/community' },
    { id: 'challenges', icon: 'fas fa-trophy', label: 'Challenges', path: '/challenges' },
    { id: 'schedule', icon: 'fas fa-calendar-alt', label: 'Schedule', path: '/schedule' },
    { id: 'biometrics', icon: 'fas fa-heartbeat', label: 'Biometrics', path: '/biometrics' },
    { id: 'meal-planner', icon: 'fas fa-clipboard-list', label: 'Meal Planner', path: '/meal-planner' },
    { id: 'nutriscan', icon: 'fas fa-qrcode', label: 'NutriScan', path: '/nutriscan' },
    { id: 'virtual-doctor', icon: 'fas fa-user-md', label: 'Virtual Doctor', path: '/virtual-doctor' },
    { id: 'chat', icon: 'fas fa-comments', label: 'Chat', path: '/chat' },
    { id: 'settings', icon: 'fas fa-cog', label: 'Settings', path: '/settings' }
  ];

  const handleNavigation = (path) => {
    window.location.href = path;
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      window.location.href = '/logout';
    }
  };

  const getUserDisplayName = () => {
    if (user?.onboardingData?.personalInfo?.firstName) {
      return user.onboardingData.personalInfo.firstName;
    }
    if (user?.fullName && user.fullName !== "User") {
      return user.fullName.split(" ")[0];
    }
    return "User";
  };

  const getUserPlan = () => {
    return user?.subscriptionStatus === 'premium' ? 'Premium' : 'Free Plan';
  };

  return (
    <motion.div 
      className="sidebar"
      initial={{ x: -280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, type: "spring" }}
    >
      {/* User Profile Section */}
      <div className="sidebar-header">
        <div className="user-avatar">
          <img 
            src={user?.profilePicture || `https://ui-avatars.com/api/?name=${getUserDisplayName()}&background=667eea&color=fff&size=40`}
            alt="User Avatar"
          />
        </div>
        <div className="user-info">
          <h3 className="user-name">{getUserDisplayName()}</h3>
          <span className="user-plan">{getUserPlan()}</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="nav-menu">
        <ul>
          {navigationItems.map((item, index) => (
            <motion.li 
              key={item.id}
              className="nav-item"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <button
                className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                <i className={item.icon}></i>
                <span>{item.label}</span>
              </button>
            </motion.li>
          ))}
        </ul>
      </nav>

      {/* Logout Section */}
      <div className="logout-section">
        <button className="logout-link" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i>
          <span>Logout</span>
        </button>
      </div>

      {/* Premium Upgrade Banner (if free user) */}
      {user?.subscriptionStatus !== 'premium' && (
        <motion.div 
          className="upgrade-banner"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="upgrade-content">
            <div className="upgrade-icon">⭐</div>
            <h4>Upgrade to Premium</h4>
            <p>Unlock advanced features and personalized coaching</p>
            <button 
              className="upgrade-btn"
              onClick={() => handleNavigation('/subscription')}
            >
              Upgrade Now
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Sidebar;