#!/usr/bin/env node

/**
 * Authentication System Analysis
 * Analyzes the current auth system to identify inconsistencies
 */

const fs = require('fs');

function analyzeAuthSystem() {
  console.log('🔍 AUTHENTICATION SYSTEM ANALYSIS\n');
  
  const appContent = fs.readFileSync('./app.js', 'utf8');
  
  // Check session usage
  const sessionUsages = appContent.match(/req\.session\./g) || [];
  console.log(`📊 Session Usage: ${sessionUsages.length} occurrences`);
  
  // Check token usage
  const tokenUsages = appContent.match(/token/gi) || [];
  console.log(`🎫 Token Usage: ${tokenUsages.length} occurrences`);
  
  // Check authentication methods
  console.log('\n🔐 AUTHENTICATION METHODS FOUND:');
  
  // Session-based auth
  if (appContent.includes('req.session.user')) {
    console.log('✅ Session-based authentication');
  }
  
  // Token-based auth
  if (appContent.includes('req.query.token')) {
    console.log('✅ Token-based authentication (query params)');
  }
  
  if (appContent.includes('jwt')) {
    console.log('✅ JWT token authentication');
  }
  
  // Check password reset method
  console.log('\n🔑 PASSWORD RESET SYSTEM:');
  if (appContent.includes('req.session.passwordReset')) {
    console.log('❌ Still using session-based password reset');
  }
  
  if (appContent.includes('PasswordReset.createReset')) {
    console.log('✅ Using database-based password reset');
  }
  
  // Check middleware consistency
  console.log('\n🛡️ MIDDLEWARE ANALYSIS:');
  
  const isAuthenticatedMatch = appContent.match(/const isAuthenticated = \(req, res, next\) => \{([\s\S]*?)\};/);
  if (isAuthenticatedMatch) {
    const authMiddleware = isAuthenticatedMatch[1];
    
    if (authMiddleware.includes('req.session.user')) {
      console.log('📝 isAuthenticated uses sessions');
    }
    
    if (authMiddleware.includes('req.query.token')) {
      console.log('📝 isAuthenticated uses query tokens');
    }
    
    if (authMiddleware.includes('fromToken: true')) {
      console.log('📝 isAuthenticated creates sessions from tokens');
    }
  }
  
  // Check route protection
  console.log('\n🛣️ ROUTE PROTECTION:');
  const protectedRoutes = appContent.match(/app\.get\(['"`]([^'"`]+)['"`], isAuthenticated/g) || [];
  console.log(`🔒 Protected routes: ${protectedRoutes.length}`);
  
  // Check session configuration
  console.log('\n⚙️ SESSION CONFIGURATION:');
  if (appContent.includes('saveUninitialized: false')) {
    console.log('✅ saveUninitialized: false (good for serverless)');
  } else {
    console.log('❌ saveUninitialized not optimized for serverless');
  }
  
  if (appContent.includes('secure: process.env.NODE_ENV')) {
    console.log('✅ Conditional secure cookies');
  }
  
  if (appContent.includes('sameSite:')) {
    console.log('✅ SameSite policy configured');
  }
  
  // Check for inconsistencies
  console.log('\n⚠️ POTENTIAL ISSUES:');
  
  if (appContent.includes('req.session.passwordReset') && appContent.includes('PasswordReset.createReset')) {
    console.log('❌ Mixed password reset methods (session + database)');
  }
  
  if (appContent.includes('req.session.user') && appContent.includes('req.query.token')) {
    console.log('⚠️ Mixed authentication methods (session + token)');
  }
  
  if (appContent.includes('process.env.VERCEL') && appContent.includes('MemoryStore')) {
    console.log('⚠️ Memory store used in serverless environment');
  }
  
  console.log('\n📋 RECOMMENDATIONS:');
  console.log('1. Choose ONE authentication method (sessions OR tokens)');
  console.log('2. Ensure password reset is fully database-based');
  console.log('3. Optimize session config for serverless');
  console.log('4. Remove conflicting authentication code');
}

analyzeAuthSystem();