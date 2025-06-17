# MongoDB Integration Setup Guide

## Overview
Your fitness app now supports MongoDB for persistent data storage. This replaces the previous in-memory user sessions with a proper database.

## What's Been Added

### 1. Dependencies
- `mongoose` - MongoDB object modeling for Node.js
- `mongodb` - MongoDB driver
- `bcrypt` - Password hashing for security

### 2. New Files Created
- `config/database.js` - Database connection configuration
- `models/User.js` - User data model with comprehensive schema
- `services/userService.js` - User operations service layer
- `MONGODB_SETUP.md` - This setup guide

### 3. Updated Files
- `app.js` - Integrated MongoDB connection and updated routes
- `.env` - Added MongoDB configuration variables

## Setup Options

### Option 1: Local MongoDB (Recommended for Development)

#### Install MongoDB Locally
**macOS (using Homebrew):**
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb/brew/mongodb-community

# Verify it's running
brew services list | grep mongodb
```

**Windows:**
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Install and start the MongoDB service
3. MongoDB will run on `mongodb://localhost:27017` by default

**Linux (Ubuntu/Debian):**
```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Configuration
Your `.env` file is already configured for local MongoDB:
```env
MONGODB_URI=mongodb://localhost:27017/fit-with-ai
```

### Option 2: MongoDB Atlas (Cloud - Recommended for Production)

#### Setup MongoDB Atlas
1. Go to https://www.mongodb.com/atlas
2. Create a free account
3. Create a new cluster (free tier available)
4. Create a database user with read/write permissions
5. Add your IP address to the network access list (or use 0.0.0.0/0 for all IPs)
6. Get your connection string

#### Update Environment Variables
Replace the MONGODB_URI in your `.env` file:
```env
# Replace with your actual Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fit-with-ai?retryWrites=true&w=majority
```

## Testing the Setup

### 1. Start Your Application
```bash
npm start
```

### 2. Check Database Connection
Visit: http://localhost:3001/debug-database

You should see:
```json
{
  "health": {
    "healthy": true,
    "status": "connected",
    "host": "localhost",
    "port": 27017,
    "name": "fit-with-ai"
  },
  "connection": {
    "status": "connected",
    "host": "localhost",
    "port": 27017,
    "name": "fit-with-ai"
  },
  "environment": {
    "NODE_ENV": "production",
    "MONGODB_URI": "Set",
    "MONGO_URL": "Not set"
  }
}
```

### 3. Test User Registration
1. Go to your app's homepage
2. Try signing up with a new account
3. Complete the onboarding process
4. Check if data persists after browser refresh

## Database Schema

### User Model Features
- **Authentication**: Email/password with bcrypt hashing
- **Personal Info**: Name, age, gender, height, weight, location
- **Fitness Goals**: Primary goals, target weight, activity level, workout preferences
- **Health Info**: Medical conditions, medications, allergies, dietary restrictions
- **Preferences**: Workout timing, equipment access, notifications, privacy settings
- **Activity Tracking**: Workouts, biometrics, nutrition logs
- **Social Features**: Friends, challenges
- **AI Coach Data**: Personality type, conversation history

### Sample User Document
```javascript
{
  "_id": ObjectId("..."),
  "email": "user@example.com",
  "fullName": "John Doe",
  "onboardingCompleted": true,
  "personalInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "age": 30,
    "gender": "male",
    "height": 180,
    "weight": 75
  },
  "fitnessGoals": {
    "primaryGoal": "muscle-gain",
    "activityLevel": "moderately-active",
    "workoutFrequency": 4
  },
  "workouts": [...],
  "biometrics": [...],
  "nutritionLogs": [...],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## API Changes

### New User Service Methods
- `UserService.createUser(userData)` - Create new user
- `UserService.authenticateUser(email, password)` - Login user
- `UserService.getUserByEmail(email)` - Get user data
- `UserService.completeOnboarding(email, data)` - Save onboarding data
- `UserService.addWorkout(email, workout)` - Add workout log
- `UserService.addBiometrics(email, data)` - Add biometric data
- `UserService.addNutritionLog(email, data)` - Add nutrition log

### Updated Routes
- `POST /signup` - Now saves to database
- `POST /login` - Now authenticates against database
- `POST /CustomOnboarding/complete` - Now saves onboarding data to database

## Troubleshooting

### Common Issues

#### 1. Connection Refused Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB is running locally
```bash
# macOS
brew services start mongodb/brew/mongodb-community

# Linux
sudo systemctl start mongod

# Windows
Start MongoDB service from Services panel
```

#### 2. Authentication Failed (Atlas)
```
Error: Authentication failed
```
**Solution**: 
- Check username/password in connection string
- Ensure database user has proper permissions
- Verify network access settings in Atlas

#### 3. Database Not Found
The database and collections will be created automatically when you first insert data.

#### 4. Password Validation Error
```
Error: Password must be at least 6 characters long
```
**Solution**: Ensure passwords meet minimum requirements

### Debug Routes (Development Only)
- `/debug-database` - Check database connection
- `/debug-session` - Check session data
- `/debug-email` - Test email functionality

## Security Features

### Password Security
- Passwords are hashed using bcrypt with 12 salt rounds
- Original passwords are never stored in the database
- Password comparison is done securely using bcrypt.compare()

### Data Validation
- Email format validation
- Required field validation
- Data type validation through Mongoose schemas
- Unique email constraint

### Session Security
- Session data includes user ID for database lookups
- Sensitive data (like passwords) never stored in sessions
- Session-based authentication with database verification

## Next Steps

### Recommended Enhancements
1. **Add data backup strategy**
2. **Implement data migration scripts**
3. **Add database indexing for performance**
4. **Set up monitoring and logging**
5. **Add data validation middleware**
6. **Implement soft delete for user accounts**

### Production Considerations
1. **Use MongoDB Atlas for production**
2. **Set up database monitoring**
3. **Configure proper backup schedules**
4. **Implement connection pooling optimization**
5. **Add database performance monitoring**

## Summary

✅ **Small to Medium Process**: The MongoDB integration is straightforward and doesn't require major architectural changes.

✅ **Benefits**:
- Persistent data storage
- Scalable user management
- Rich data modeling capabilities
- Professional authentication system
- Ready for production deployment

✅ **What Works Now**:
- User registration and login
- Onboarding data persistence
- Session management with database backing
- Password security with bcrypt
- Comprehensive user data model

Your fitness app now has a robust, scalable database backend that can handle user growth and complex fitness data tracking!