const fs = require('fs');
const path = require('path');

console.log('Fixing session configuration syntax...');

// Read the file
const appPath = path.join(__dirname, 'app.js');
let content = fs.readFileSync(appPath, 'utf8');

// Find and replace the entire session configuration block
const sessionStart = content.indexOf('app.use(session({');
const sessionEnd = content.indexOf('}));', sessionStart) + 4;

if (sessionStart !== -1 && sessionEnd !== -1) {
  const beforeSession = content.substring(0, sessionStart);
  const afterSession = content.substring(sessionEnd);
  
  const fixedSessionConfig = `app.use(session({
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
  
  content = beforeSession + fixedSessionConfig + afterSession;
  console.log('✅ Fixed session configuration');
} else {
  console.log('❌ Could not find session configuration');
}

// Fix other common syntax issues
console.log('Fixing other syntax issues...');

// Fix missing commas in object literals
content = content.replace(/(\w+): ([^,\n}]+)\n(\s+)(\w+):/g, '$1: $2,\n$3$4:');

// Fix function parameters
content = content.replace(/\(req res next\)/g, '(req, res, next)');
content = content.replace(/\(req res\)/g, '(req, res)');

// Fix console.log statements
content = content.replace(/console\.log\('([^']+)' ([^)]+)\)/g, "console.log('$1', $2)");
content = content.replace(/console\.error\('([^']+)' ([^)]+)\)/g, "console.error('$1', $2)");

// Write back
fs.writeFileSync(appPath, content);
console.log('✅ Applied all syntax fixes');

// Verify
console.log('\nVerifying syntax...');
const { exec } = require('child_process');
exec('node -c app.js', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Still has syntax errors:');
    console.log(stderr);
  } else {
    console.log('✅ All syntax errors fixed!');
  }
});