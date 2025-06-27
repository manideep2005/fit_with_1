const fs = require('fs');
const path = require('path');

console.log('Fixing app.js syntax errors line by line...');

// Read the file
const appPath = path.join(__dirname, 'app.js');
let lines = fs.readFileSync(appPath, 'utf8').split('\n');

console.log('Total lines:', lines.length);

// Fix specific lines with missing commas
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Fix session configuration
  if (line.includes("secret: process.env.SESSION_SECRET || 'your-secret-key-here-change-in-production'") && !line.includes(',')) {
    lines[i] = line + ',';
    console.log(`Fixed line ${i + 1}: Added comma to secret`);
  }
  
  if (line.trim() === 'resave: false' && !line.includes(',')) {
    lines[i] = line + ',';
    console.log(`Fixed line ${i + 1}: Added comma to resave`);
  }
  
  if (line.trim() === 'saveUninitialized: true' && !line.includes(',')) {
    lines[i] = line + ',';
    console.log(`Fixed line ${i + 1}: Added comma to saveUninitialized`);
  }
  
  if (line.includes('maxAge: 1000 * 60 * 60 * 24') && !line.includes(',')) {
    lines[i] = line + ',';
    console.log(`Fixed line ${i + 1}: Added comma to maxAge`);
  }
  
  if (line.trim() === 'httpOnly: true' && !line.includes(',')) {
    lines[i] = line + ',';
    console.log(`Fixed line ${i + 1}: Added comma to httpOnly`);
  }
  
  if (line.includes('secure: false') && !line.includes(',')) {
    lines[i] = line + ',';
    console.log(`Fixed line ${i + 1}: Added comma to secure`);
  }
  
  if (line.includes("sameSite: 'lax'") && !line.includes(',')) {
    lines[i] = line + ',';
    console.log(`Fixed line ${i + 1}: Added comma to sameSite`);
  }
  
  // Fix function parameters
  if (line.includes('(req res next)')) {
    lines[i] = line.replace('(req res next)', '(req, res, next)');
    console.log(`Fixed line ${i + 1}: Added commas to function parameters`);
  }
  
  if (line.includes('(req res)')) {
    lines[i] = line.replace('(req res)', '(req, res)');
    console.log(`Fixed line ${i + 1}: Added comma to function parameters`);
  }
  
  // Fix console.log statements
  if (line.includes("console.log('Auth check - Session user:' req.session.user)")) {
    lines[i] = line.replace("console.log('Auth check - Session user:' req.session.user)", "console.log('Auth check - Session user:', req.session.user)");
    console.log(`Fixed line ${i + 1}: Added comma to console.log`);
  }
  
  if (line.includes("console.log('Auth check - Session ID:' req.sessionID)")) {
    lines[i] = line.replace("console.log('Auth check - Session ID:' req.sessionID)", "console.log('Auth check - Session ID:', req.sessionID)");
    console.log(`Fixed line ${i + 1}: Added comma to console.log`);
  }
  
  if (line.includes("console.log('Auth check - Query token:' req.query.token)")) {
    lines[i] = line.replace("console.log('Auth check - Query token:' req.query.token)", "console.log('Auth check - Query token:', req.query.token)");
    console.log(`Fixed line ${i + 1}: Added comma to console.log`);
  }
  
  // Fix object properties missing commas
  if (line.includes('health: healthCheck') && !line.includes(',') && i < lines.length - 1 && lines[i + 1].trim().startsWith('connection:')) {
    lines[i] = line + ',';
    console.log(`Fixed line ${i + 1}: Added comma to health property`);
  }
  
  if (line.includes('connection: connectionStatus') && !line.includes(',') && i < lines.length - 1 && lines[i + 1].trim().startsWith('environment:')) {
    lines[i] = line + ',';
    console.log(`Fixed line ${i + 1}: Added comma to connection property`);
  }
  
  if (line.includes('NODE_ENV: process.env.NODE_ENV') && !line.includes(',') && i < lines.length - 1 && lines[i + 1].trim().includes('MONGODB_URI:')) {
    lines[i] = line + ',';
    console.log(`Fixed line ${i + 1}: Added comma to NODE_ENV property`);
  }
  
  if (line.includes("MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set'") && !line.includes(',') && i < lines.length - 1 && lines[i + 1].trim().includes('MONGO_URL:')) {
    lines[i] = line + ',';
    console.log(`Fixed line ${i + 1}: Added comma to MONGODB_URI property`);
  }
}

// Write the fixed content back
const fixedContent = lines.join('\n');
fs.writeFileSync(appPath, fixedContent);

console.log('✅ Applied line-by-line fixes to app.js');

// Verify syntax
console.log('\nVerifying syntax...');
const { exec } = require('child_process');
exec('node -c app.js', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Still has syntax errors:');
    console.log(stderr);
    
    // Show the problematic line
    const match = stderr.match(/app\.js:(\d+)/);
    if (match) {
      const lineNum = parseInt(match[1]);
      console.log(`\nProblematic area around line ${lineNum}:`);
      const startLine = Math.max(1, lineNum - 3);
      const endLine = Math.min(lines.length, lineNum + 3);
      exec(`sed -n '${startLine},${endLine}p' app.js`, (err, out) => {
        if (!err) console.log(out);
      });
    }
  } else {
    console.log('✅ Syntax is now valid!');
  }
});