// Service separation testing utility

const testServiceSeparation = async (req, res) => {
  const testResults = {
    timestamp: new Date().toISOString(),
    sessionInfo: {
      hasSession: !!req.session,
      hasUser: !!req.session?.user,
      userEmail: req.session?.user?.email,
      selectedService: req.session?.user?.selectedService,
      databaseService: req.session?.user?.databaseService,
      onboardingCompleted: req.session?.user?.onboardingCompleted
    },
    routeInfo: {
      path: req.path,
      method: req.method,
      originalUrl: req.originalUrl
    },
    serviceDetection: {
      isHealthRoute: req.path.startsWith('/vitahealth'),
      isFitnessRoute: req.path.startsWith('/fitness'),
      isLegacyRoute: !['/vitahealth', '/fitness'].some(prefix => req.path.startsWith(prefix)) && req.path !== '/',
      detectedService: req.session?.user?.selectedService || req.session?.user?.databaseService || 'fitness'
    },
    recommendations: []
  };

  // Add recommendations based on test results
  if (!testResults.sessionInfo.hasUser) {
    testResults.recommendations.push('User not authenticated - should redirect to login');
  } else {
    const userService = testResults.serviceDetection.detectedService;
    const isHealthUser = userService === 'health';
    const isFitnessUser = userService === 'fitness';
    
    if (isHealthUser && testResults.serviceDetection.isFitnessRoute) {
      testResults.recommendations.push('Health user accessing fitness route - should redirect to /vitahealth/dashboard');
    }
    
    if (isFitnessUser && testResults.serviceDetection.isHealthRoute) {
      testResults.recommendations.push('Fitness user accessing health route - should redirect to /fitness/dashboard');
    }
    
    if (testResults.serviceDetection.isLegacyRoute) {
      const servicePrefix = isHealthUser ? '/vitahealth' : '/fitness';
      testResults.recommendations.push(`Legacy route detected - should redirect to ${servicePrefix}${req.path}`);
    }
    
    if (!testResults.sessionInfo.onboardingCompleted) {
      testResults.recommendations.push('Onboarding not completed - should redirect to /CustomOnboarding');
    }
  }

  return testResults;
};

const createServiceSeparationReport = async (DualUserService) => {
  try {
    const report = {
      timestamp: new Date().toISOString(),
      databaseStatus: await DualUserService.getDatabaseStatus(),
      healthCheck: await DualUserService.healthCheck(),
      serviceConfiguration: {
        fitnessDbUri: !!process.env.FITNESS_DB_URI || !!process.env.MONGODB_URI,
        healthDbUri: !!process.env.HEALTH_DB_URI,
        dualDatabaseEnabled: true
      },
      recommendations: []
    };

    // Add configuration recommendations
    if (!report.serviceConfiguration.healthDbUri) {
      report.recommendations.push('HEALTH_DB_URI environment variable not set - health service will not work properly');
    }

    if (!report.serviceConfiguration.fitnessDbUri) {
      report.recommendations.push('FITNESS_DB_URI or MONGODB_URI environment variable not set - fitness service will not work properly');
    }

    // Check database connections
    if (!report.healthCheck.fitness?.healthy) {
      report.recommendations.push('Fitness database connection is not healthy');
    }

    if (!report.healthCheck.health?.healthy) {
      report.recommendations.push('Health database connection is not healthy');
    }

    return report;
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      error: error.message,
      recommendations: ['Failed to generate service separation report - check database connections']
    };
  }
};

module.exports = {
  testServiceSeparation,
  createServiceSeparationReport
};