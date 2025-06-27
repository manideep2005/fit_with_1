const fs = require('fs');
const path = require('path');

console.log('Fixing syntax errors in app.js...');

// Read the current app.js file
const appPath = path.join(__dirname, 'app.js');
let content = fs.readFileSync(appPath, 'utf8');

// Fix 1: Missing commas in object literals
console.log('1. Fixing missing commas in object literals...');
content = content.replace(/(\w+): ([^,\n}]+)\n(\s+)(\w+):/g, '$1: $2,\n$3$4:');

// Fix 2: Missing commas in function parameters
console.log('2. Fixing missing commas in function parameters...');
content = content.replace(/\(req res next\)/g, '(req, res, next)');
content = content.replace(/\(req res\)/g, '(req, res)');
content = content.replace(/\(senderId receiverId/g, '(senderId, receiverId');
content = content.replace(/receiverId workoutData\)/g, 'receiverId, workoutData)');
content = content.replace(/receiverId progressData\)/g, 'receiverId, progressData)');

// Fix 3: Missing commas in console.log statements
console.log('3. Fixing console.log statements...');
content = content.replace(/console\.log\('([^']+)' ([^)]+)\)/g, "console.log('$1', $2)");
content = content.replace(/console\.error\('([^']+)' ([^)]+)\)/g, "console.error('$1', $2)");

// Fix 4: Missing commas in function calls
console.log('4. Fixing function call parameters...');
content = content.replace(/sendMessage\(\s*senderId\s*receiverId\s*content\s*'([^']+)'\s*\{/g, "sendMessage(\n        senderId,\n        receiverId,\n        content,\n        '$1',\n        {");

// Fix 5: Fix specific problematic sections
console.log('5. Fixing specific problematic sections...');

// Fix the debug endpoint section
const debugSectionFix = `            });
        } catch (error) {
            res.status(500).json({
                error: error.message,
                stack: error.stack,
                connection: database.getConnectionStatus()
            });
        }
    });
}

// Session debugging endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug-session-detailed', (req, res) => {
    res.json({
      sessionExists: !!req.session,
      sessionID: req.sessionID,
      sessionUser: req.session.user,
      sessionData: req.session,
      cookies: req.headers.cookie,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      sessionSaveMethod: req.session.save ? 'Available' : 'Not available',
      sessionDestroyMethod: req.session.destroy ? 'Available' : 'Not available'
    });
  });

  app.post('/debug-create-test-session', async (req, res) => {`;

// Find and replace the problematic debug section
const debugSectionStart = content.indexOf('MONGO_URL: process.env.MONGO_URL');
const debugSectionEnd = content.indexOf('app.post(\'/debug-create-test-session\'');
if (debugSectionStart !== -1 && debugSectionEnd !== -1) {
  const beforeSection = content.substring(0, debugSectionStart);
  const afterSection = content.substring(debugSectionEnd);
  content = beforeSection + 'MONGO_URL: process.env.MONGO_URL ? \'Set\' : \'Not set\'\n                }\n' + debugSectionFix + afterSection.substring(afterSection.indexOf('async (req, res) => {'));
}

// Fix 6: Session configuration syntax
console.log('6. Fixing session configuration...');
const sessionConfigPattern = /app\.use\(session\(\{\s*secret: process\.env\.SESSION_SECRET[^}]+\}\)\);/s;
const sessionConfigReplacement = `app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here-change-in-production',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        httpOnly: true,
        secure: false, // Keep false for now to avoid HTTPS issues
        sameSite: 'lax'
    },
    name: 'fit-with-ai-session'
}));`;

content = content.replace(sessionConfigPattern, sessionConfigReplacement);

// Fix 7: Authentication middleware syntax
console.log('7. Fixing authentication middleware...');
const authPattern = /const isAuthenticated = \(req res next\) => \{/;
content = content.replace(authPattern, 'const isAuthenticated = (req, res, next) => {');

// Fix 8: Console.log statements with missing commas
console.log('8. Fixing console.log statements with missing commas...');
content = content.replace(/console\.log\('Auth check - Session user:' req\.session\.user\)/g, "console.log('Auth check - Session user:', req.session.user)");
content = content.replace(/console\.log\('Auth check - Session ID:' req\.sessionID\)/g, "console.log('Auth check - Session ID:', req.sessionID)");
content = content.replace(/console\.log\('Auth check - Query token:' req\.query\.token\)/g, "console.log('Auth check - Query token:', req.query.token)");

// Write the fixed content back
fs.writeFileSync(appPath, content);

console.log('✅ Syntax errors fixed in app.js');

// Verify the fix
console.log('\nVerifying syntax...');
const { exec } = require('child_process');
exec('node -c app.js', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Still has syntax errors:');
    console.log(stderr);
  } else {
    console.log('✅ Syntax is now valid!');
  }
});