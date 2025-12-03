import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Workouts from './components/Workouts';
import Nutrition from './components/Nutrition';
import NutriScan from './components/NutriScan';
import Progress from './components/Progress';
import AICoach from './components/AICoach';
import Challenges from './components/Challenges';
import Community from './components/Community';
import VirtualDoctor from './components/VirtualDoctor';
import Settings from './components/Settings';
import Schedule from './components/Schedule';
import MealPlanner from './components/MealPlanner';
import Subscription from './components/Subscription';
import './App.css';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/nutriscan" element={<NutriScan />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/ai-coach" element={<AICoach />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/community" element={<Community />} />
          <Route path="/virtual-doctor" element={<VirtualDoctor />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/meal-planner" element={<MealPlanner />} />
          <Route path="/subscription" element={<Subscription />} />
        </Routes>
      </Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: '#fff',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      />
    </div>
  );
}

export default App;
