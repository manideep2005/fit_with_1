# Streak System Documentation

## Overview
The streak system tracks user consistency in workouts, nutrition logging, and daily logins, similar to Snapchat's streak feature. It provides motivation through visual feedback, rewards, and social competition.

## Features

### 🔥 Streak Types
1. **Workout Streak** - Consecutive days with logged workouts
2. **Nutrition Streak** - Consecutive days with nutrition logs
3. **Login Streak** - Consecutive days of app usage

### 📊 Streak Calculation
- **Active**: Completed activity today
- **At Risk**: Completed yesterday, need to do today
- **Broken**: Missed more than 1 day
- **Grace Period**: 24-hour window to maintain streak

### 🎯 Milestones & Rewards
- **3 days**: First milestone badges
- **7 days**: Weekly achievement
- **14 days**: Fortnight fighter
- **30 days**: Monthly master
- **50+ days**: Elite status with premium rewards

### 🏆 Gamification Elements
- **Emojis**: Visual streak indicators (🔥 → 🚀 → ⭐ → 💎 → 👑 → 🏆)
- **Leaderboards**: Compare streaks with friends
- **Rewards**: Health benefits, fitness perks, premium features
- **Achievements**: Unlock badges and titles

## Technical Implementation

### Database Schema
```javascript
// User model includes:
gamification: {
  streaks: {
    workout: {
      current: Number,
      longest: Number,
      lastWorkoutDate: Date
    },
    nutrition: {
      current: Number,
      longest: Number,
      lastLogDate: Date
    },
    login: {
      current: Number,
      longest: Number,
      lastLoginDate: Date
    }
  }
}
```

### API Endpoints
- `GET /api/streaks/status` - Get user's current streak status
- `POST /api/streaks/update` - Force update user streaks
- `GET /api/streaks/leaderboard/:type` - Get streak leaderboard
- `GET /api/streaks/rewards` - Get streak-based rewards

### Services
- **StreakService**: Core streak calculation logic
- **StreakMiddleware**: Auto-update streaks on activity
- **StreakJob**: Daily cleanup of expired streaks

### Automatic Updates
- Workout logging triggers workout streak update
- Nutrition logging triggers nutrition streak update
- Login triggers login streak update
- Daily job checks and breaks expired streaks

## Usage Examples

### Frontend Integration
```javascript
// Load user streaks
const response = await fetch('/api/streaks/status');
const { streaks } = await response.json();

// Display streak status
console.log(`Workout streak: ${streaks.workout.current} days ${streaks.workout.emoji}`);
```

### Backend Integration
```javascript
// Update streaks after workout
const streakService = require('./services/streakService');
await streakService.updateUserStreaks(userId);

// Check for rewards
const status = await streakService.getStreakStatus(userId);
if (status.workout.current === 7) {
  await streakService.awardStreakRewards(userId, 'workout', 7);
}
```

## Configuration

### Environment Variables
- `NODE_ENV`: Set to 'production' to disable test features
- `MONGODB_URI`: Database connection string

### Scheduled Jobs
- Daily at midnight: Check and break expired streaks
- Configurable timezone in `jobs/streakJob.js`

## Testing

Run the test script to verify functionality:
```bash
node test-streak-system.js
```

## Files Structure
```
services/
  ├── streakService.js      # Core streak logic
middleware/
  ├── streakMiddleware.js   # Auto-update middleware
routes/
  ├── streaks.js           # API endpoints
jobs/
  ├── streakJob.js         # Scheduled tasks
views/
  ├── challenges.ejs       # Frontend display
```

## Future Enhancements
- [ ] Team streaks for groups
- [ ] Streak freeze/pause feature
- [ ] Custom streak types
- [ ] Push notifications for at-risk streaks
- [ ] Streak sharing on social media
- [ ] Advanced analytics and insights

## Troubleshooting

### Common Issues
1. **Streaks not updating**: Check middleware is applied to workout/nutrition endpoints
2. **Timezone issues**: Verify server timezone matches user timezone
3. **Performance**: Index streak fields for large user bases

### Debug Commands
```javascript
// Check user's raw streak data
const user = await User.findById(userId);
console.log(user.gamification.streaks);

// Force streak recalculation
await streakService.updateUserStreaks(userId);
```

## Support
For issues or questions about the streak system, check the logs or run the test script to verify functionality.