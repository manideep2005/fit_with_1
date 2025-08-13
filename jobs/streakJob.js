const cron = require('node-cron');
const streakService = require('../services/streakService');

// Run daily at midnight to check expired streaks
const scheduleStreakCheck = () => {
  // Run at 00:01 every day
  cron.schedule('1 0 * * *', async () => {
    console.log('Running daily streak check...');
    try {
      await streakService.checkExpiredStreaks();
      console.log('Daily streak check completed successfully');
    } catch (error) {
      console.error('Daily streak check failed:', error);
    }
  }, {
    timezone: "America/New_York" // Adjust timezone as needed
  });

  console.log('Streak check job scheduled for daily execution at midnight');
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