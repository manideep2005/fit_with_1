const fs = require('fs');

// Read the app.js file
let content = fs.readFileSync('/Users/manideepgonugunta/Desktop/fit-with-1/app.js', 'utf8');

console.log('Adding health assessment route fixes...');

// Add additional route mounting for meal-planner (without /api prefix for frontend compatibility)
if (!content.includes("app.use('/meal-planner'")) {
  const additionalRoute = `
// Mount meal planner routes (for frontend compatibility)
app.use('/meal-planner', isAuthenticated, ensureDbConnection, require('./routes/mealPlanner'));
`;

  // Find where to insert it (after the existing API route)
  const apiMealPlannerIndex = content.indexOf("app.use('/api/meal-planner'");
  if (apiMealPlannerIndex !== -1) {
    const lineEnd = content.indexOf('\n', apiMealPlannerIndex);
    content = content.slice(0, lineEnd + 1) + additionalRoute + content.slice(lineEnd + 1);
    console.log('✅ Added /meal-planner route mounting');
  }
}

// Also ensure the health route exists in protected routes
if (!content.includes("'/health'")) {
  content = content.replace(
    "'/analytics'\n];",
    "'/analytics',\n  '/health'\n];"
  );
  console.log('✅ Added /health to protected routes');
}

console.log('Writing fixed content...');

// Write the fixed content back
fs.writeFileSync('/Users/manideepgonugunta/Desktop/fit-with-1/app.js', content);

console.log('✅ Health assessment routes fixed!');