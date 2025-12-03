const fs = require('fs').promises;
const path = require('path');

class AdminLogService {
  constructor() {
    this.logFile = path.join(__dirname, '../logs/admin-activity.log');
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      const logDir = path.dirname(this.logFile);
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  async log(level, title, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      title,
      message,
      ...metadata
    };

    try {
      // Write to file
      await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
      
      // Also log to console in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[ADMIN LOG] ${level.toUpperCase()}: ${title} - ${message}`);
      }
    } catch (error) {
      console.error('Failed to write admin log:', error);
    }
  }

  async info(title, message, metadata = {}) {
    return this.log('info', title, message, metadata);
  }

  async warning(title, message, metadata = {}) {
    return this.log('warning', title, message, metadata);
  }

  async error(title, message, metadata = {}) {
    return this.log('error', title, message, metadata);
  }

  async success(title, message, metadata = {}) {
    return this.log('success', title, message, metadata);
  }

  async getLogs(filters = {}) {
    try {
      const data = await fs.readFile(this.logFile, 'utf8');
      const logs = data.trim().split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .reverse(); // Most recent first

      // Apply filters
      let filteredLogs = logs;

      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level);
      }

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= fromDate);
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= toDate);
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.title.toLowerCase().includes(searchTerm) ||
          log.message.toLowerCase().includes(searchTerm)
        );
      }

      return filteredLogs;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // No log file exists yet
      }
      throw error;
    }
  }

  async clearLogs() {
    try {
      await fs.writeFile(this.logFile, '');
      return true;
    } catch (error) {
      console.error('Failed to clear logs:', error);
      return false;
    }
  }

  // Helper method to log user actions
  async logUserAction(action, userId, userEmail, ip, additionalData = {}) {
    return this.info(
      `User ${action}`,
      `User ${userEmail} ${action.toLowerCase()}`,
      {
        userId,
        userEmail,
        ip,
        action,
        ...additionalData
      }
    );
  }

  // Helper method to log admin actions
  async logAdminAction(action, adminId, adminEmail, targetData = {}) {
    return this.info(
      `Admin ${action}`,
      `Admin ${adminEmail} performed: ${action}`,
      {
        adminId,
        adminEmail,
        action,
        target: targetData
      }
    );
  }

  // Helper method to log system events
  async logSystemEvent(event, details, level = 'info') {
    return this.log(level, `System ${event}`, details, {
      event,
      system: true
    });
  }
}

module.exports = new AdminLogService();