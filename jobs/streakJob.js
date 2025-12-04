const streakService = require('../services/streakService');

// Fallback implementation without cron
const scheduleStreakCheck = () => {
  console.log('⏰ Streak check job initialized (cron disabled)');
  // Optional: Set up simple interval for basic scheduling
  // setInterval(() => runStreakCheck(), 24 * 60 * 60 * 1000); // Daily
};

// Manual function to run streak check (for testing)
const runStreakCheck = async () => {
  try {
    console.log('Running manual streak check...');
    await streakService.checkExpiredStreaks();
    console.log('Manual streak check completed successfully');
  } catch (error) {
    console.error('Manual streak check failed:', error);
    throw error;
  }
};

module.exports = {
  scheduleStreakCheck,
  runStreakCheck
};