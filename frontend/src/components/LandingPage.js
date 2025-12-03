import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import './LandingPage.css';

const words = ["AI Fitness", "Your Health", "Your Goals", "Your Journey", "The Future"];

const LandingPage = () => {
  const [authModal, setAuthModal] = useState({ isOpen: false, tab: 'signin' });
  const [changingText, setChangingText] = useState('AI Fitness');

  useEffect(() => {
    let counter = 0;
    const interval = setInterval(() => {
      counter = (counter + 1) % words.length;
      setChangingText(words[counter]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const openModal = (tab) => {
    setAuthModal({ isOpen: true, tab });
    toast('Welcome! Please sign in or create an account.', { icon: 'ℹ️' });
  };

  const closeModal = () => {
    setAuthModal({ isOpen: false, tab: 'signin' });
  };

  const handleSignup = async (formData) => {
    try {
      const response = await fetch('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Account created successfully! Welcome to Fit-With-AI!');
        closeModal();
        setTimeout(() => {
          if (data.redirectUrl.includes('/dashboard')) {
            window.location.href = '/dashboard';
          } else {
            window.location.href = data.redirectUrl;
          }
        }, 1500);
      } else {
        toast.error(data.error || 'Signup failed. Please try again.');
      }
    } catch (error) {
      toast.error('Network error. Please check your connection and try again.');
    }
  };

  const handleSignin = async (formData) => {
    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Welcome back! Redirecting to your dashboard...');
        closeModal();
        setTimeout(() => {
          if (data.redirectUrl.includes('/dashboard')) {
            window.location.href = '/dashboard';
          } else {
            window.location.href = data.redirectUrl;
          }
        }, 1500);
      } else {
        toast.error(data.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      toast.error('Network error. Please check your connection and try again.');
    }
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="header">
        <div className="logo">Fit-With-AI</div>
        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#gallery">Gallery</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="auth-buttons">
          <button className="auth-btn signin-btn" onClick={() => openModal('signin')}>
            Sign In
          </button>
          <button className="auth-btn signup-btn" onClick={() => openModal('signup')}>
            Sign Up
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="floating-elements">
          <div className="fitness-glass-card workout"></div>
          <div className="fitness-glass-card nutrition"></div>
          <div className="fitness-glass-card yoga"></div>
          <div className="fitness-glass-card running"></div>
          <div className="fitness-glass-card nature"></div>
        </div>
        
        <motion.div 
          className="hero-content"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1 className="hero-title neon-text">
            Discover the Power of <span className="changing-text">{changingText}</span>
          </h1>
          <p className="hero-subtitle">
            Join our community of fitness enthusiasts and transform your health with personalized AI-powered workout and nutrition plans.
          </p>
          <div className="hero-buttons">
            <button className="hero-btn primary-btn" onClick={() => openModal('signup')}>
              Get Started
            </button>
            <button className="hero-btn secondary-btn" onClick={scrollToFeatures}>
              Learn More
            </button>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <h2 className="section-title">Why Choose <span>Fit-With-AI</span></h2>
        <div className="features-grid">
          {featuresData.map((feature, index) => (
            <motion.div 
              key={index}
              className="feature-card"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="feature-icon">
                <i className={feature.icon}></i>
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about">
        <div className="about-grid">
          <motion.div 
            className="about-content"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title">About <span>Fit-With-AI</span></h2>
            <p>Fit-With-AI was founded with a simple yet powerful vision: to revolutionize fitness through artificial intelligence. Our team of passionate fitness experts and AI specialists is dedicated to providing you with the most personalized fitness experience possible.</p>
            <p>What started as a small project has now evolved into a global community of fitness enthusiasts who are transforming their health with our AI-powered platform.</p>
            <div className="stats">
              <div className="stat-item">
                <div className="stat-number">2M+</div>
                <div className="stat-label">Active Users</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">50M+</div>
                <div className="stat-label">Workouts Completed</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">120+</div>
                <div className="stat-label">Countries</div>
              </div>
            </div>
          </motion.div>
          <motion.div 
            className="about-image-container"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=600&h=600" alt="About Us" className="about-image" />
          </motion.div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="gallery">
        <h2 className="section-title">Our <span>Gallery</span></h2>
        <div className="gallery-grid">
          {galleryData.map((item, index) => (
            <motion.div 
              key={index}
              className="gallery-item"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <img src={item.image} alt={item.title} className="gallery-image" />
              <div className="gallery-overlay">
                <h3 className="gallery-title">{item.title}</h3>
                <p className="gallery-desc">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="about">
        <div className="about-grid">
          <motion.div 
            className="about-content"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title">Get in <span>Touch</span></h2>
            <p>Have questions about Fit-With-AI or ready to start your fitness journey? Our team is here to help you every step of the way.</p>
            <ContactForm />
          </motion.div>
          <motion.div 
            className="about-image-container"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <img src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=600&h=600" alt="Contact Us" className="about-image" />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-col">
            <h3>Fit-With-AI</h3>
            <p>Revolutionizing fitness through artificial intelligence. Personalized workout and nutrition plans tailored just for you.</p>
            <div className="social-links">
              <a href="#" className="social-link"><i className="fab fa-facebook-f"></i></a>
              <a href="#" className="social-link"><i className="fab fa-twitter"></i></a>
              <a href="#" className="social-link"><i className="fab fa-instagram"></i></a>
              <a href="#" className="social-link"><i className="fab fa-linkedin-in"></i></a>
            </div>
          </div>
          <div className="footer-col">
            <h3>Quick Links</h3>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#gallery">Gallery</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Features</h3>
            <ul>
              <li><a href="#">Personalized Workouts</a></li>
              <li><a href="#">Nutrition Guidance</a></li>
              <li><a href="#">Progress Tracking</a></li>
              <li><a href="#">Community Support</a></li>
              <li><a href="#">Mobile App</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Contact Info</h3>
            <ul>
              <li><i className="fas fa-map-marker-alt"></i> 123 Fitness Street, AI City</li>
              <li><i className="fas fa-phone"></i> +1 (555) 123-4567</li>
              <li><i className="fas fa-envelope"></i> info@fitwithai.com</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2023 Fit-With-AI. All Rights Reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {authModal.isOpen && (
        <AuthModal 
          tab={authModal.tab}
          onClose={closeModal}
          onSignup={handleSignup}
          onSignin={handleSignin}
          onSwitchTab={(tab) => setAuthModal(prev => ({ ...prev, tab }))}
        />
      )}
    </div>
  );
};

// Features Data
const featuresData = [
  {
    icon: "fas fa-dumbbell",
    title: "Personalized Workouts",
    description: "AI-generated workout plans tailored to your fitness level, goals, and available equipment that adapt as you progress."
  },
  {
    icon: "fas fa-utensils",
    title: "Nutrition Guidance", 
    description: "Custom meal plans and nutritional advice based on your dietary preferences, restrictions, and fitness objectives."
  },
  {
    icon: "fas fa-heart-rate",
    title: "Real-time Feedback",
    description: "Advanced pose detection technology analyzes your form during exercises and provides instant corrections to prevent injuries."
  },
  {
    icon: "fas fa-chart-line",
    title: "Progress Tracking",
    description: "Comprehensive analytics that monitor your improvements, celebrate milestones, and adjust your plan for optimal results."
  },
  {
    icon: "fas fa-users",
    title: "Supportive Community",
    description: "Connect with fellow fitness enthusiasts, participate in challenges, and stay motivated with our thriving community."
  },
  {
    icon: "fas fa-mobile-alt",
    title: "Train Anywhere",
    description: "Access your workouts anywhere, anytime. Our platform works seamlessly across all devices with online and offline options."
  }
];

// Gallery Data
const galleryData = [
  {
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&h=600",
    title: "Personal Training",
    description: "Expert guidance for your fitness journey."
  },
  {
    image: "https://images.unsplash.com/photo-1532384748853-8f54a8f476e2?auto=format&fit=crop&w=600&h=600",
    title: "Nutrition Planning",
    description: "Customized meal plans for optimal health."
  },
  {
    image: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=600&h=600",
    title: "Strength Training",
    description: "Build strength and muscle effectively."
  },
  {
    image: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?auto=format&fit=crop&w=600&h=600",
    title: "Yoga & Flexibility",
    description: "Improve flexibility and mental wellness."
  },
  {
    image: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=600&h=600",
    title: "Cardio Workouts",
    description: "Effective cardio routines for endurance."
  },
  {
    image: "https://images.unsplash.com/photo-1579126038374-6064e9370f0f?auto=format&fit=crop&w=600&h=600",
    title: "Progress Tracking",
    description: "Monitor your fitness journey."
  },
  {
    image: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=600&h=600",
    title: "Healthy Lifestyle",
    description: "Transform your life with healthy habits."
  },
  {
    image: "https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=600&h=600",
    title: "Community Support",
    description: "Join our supportive fitness community."
  }
];

// Contact Form Component
const ContactForm = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success("Message sent successfully! We'll get back to you within 24 hours.");
    e.target.reset();
  };

  return (
    <form onSubmit={handleSubmit} className="contact-form">
      <div className="form-group">
        <label htmlFor="name" className="form-label">Your Name</label>
        <input type="text" id="name" className="form-input" required />
      </div>
      <div className="form-group">
        <label htmlFor="email" className="form-label">Email Address</label>
        <input type="email" id="email" className="form-input" required />
      </div>
      <div className="form-group">
        <label htmlFor="message" className="form-label">Your Message</label>
        <textarea id="message" className="form-input" rows="4" required></textarea>
      </div>
      <button type="submit" className="form-btn">Send Message</button>
    </form>
  );
};

// Auth Modal Component
const AuthModal = ({ tab, onClose, onSignup, onSignin, onSwitchTab }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (tab === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match!');
        return;
      }
      onSignup(formData);
    } else {
      onSignin({ email: formData.email, password: formData.password });
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <motion.div 
      className="auth-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="modal-container"
        initial={{ scale: 0.3, rotateY: 180 }}
        animate={{ scale: 1, rotateY: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
      >
        <div className="modal-tabs">
          <div 
            className={`modal-tab ${tab === 'signin' ? 'active' : ''}`}
            onClick={() => onSwitchTab('signin')}
          >
            Sign In
          </div>
          <div 
            className={`modal-tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => onSwitchTab('signup')}
          >
            Sign Up
          </div>
        </div>
        
        <div className="modal-content">
          <form onSubmit={handleSubmit} className="auth-form">
            {tab === 'signup' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  name="fullName"
                  className="form-input" 
                  value={formData.fullName}
                  onChange={handleChange}
                  required 
                />
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                name="email"
                className="form-input" 
                value={formData.email}
                onChange={handleChange}
                required 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                name="password"
                className="form-input" 
                value={formData.password}
                onChange={handleChange}
                required 
              />
            </div>
            
            {tab === 'signup' && (
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  className="form-input" 
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required 
                />
              </div>
            )}
            
            <button type="submit" className="form-btn">
              {tab === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
            
            <div className="form-footer">
              {tab === 'signin' ? (
                <>
                  <a href="/forgot-password">Forgot your password?</a>
                  <br />
                  Don't have an account? <a href="#" onClick={() => onSwitchTab('signup')}>Sign up</a>
                </>
              ) : (
                <>
                  Already have an account? <a href="#" onClick={() => onSwitchTab('signin')}>Sign in</a>
                </>
              )}
            </div>
          </form>
        </div>
        
        <button className="modal-close" onClick={onClose}>&times;</button>
      </motion.div>
    </motion.div>
  );
};

export default LandingPage;