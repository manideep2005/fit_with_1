// Service routing utility to handle dual service architecture

const getServiceFromUser = (user) => {
  console.log('🔍 getServiceFromUser - User object:', {
    email: user?.email,
    selectedService: user?.selectedService,
    databaseService: user?.databaseService,
    serviceType: user?.serviceType
  });
  
  // Check multiple possible service indicators
  const service = user?.selectedService || user?.databaseService || user?.serviceType || 'fitness';
  
  console.log('🎯 Determined service:', service);
  return service;
};

const getServiceDashboardUrl = (service) => {
  return service === 'health' ? '/vitahealth/dashboard' : '/fitness/dashboard';
};

const getServiceAPIPrefix = (service) => {
  return service === 'health' ? '/api/health' : '/api/fitness';
};

const redirectToServiceAPI = (req, res, endpoint) => {
  const userService = getServiceFromUser(req.session.user);
  const apiPrefix = getServiceAPIPrefix(userService);
  return res.redirect(307, `${apiPrefix}${endpoint}`);
};

module.exports = {
  getServiceFromUser,
  getServiceDashboardUrl,
  getServiceAPIPrefix,
  redirectToServiceAPI
};