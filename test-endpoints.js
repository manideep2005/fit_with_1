#!/usr/bin/env node

/**
 * Comprehensive Endpoint Testing Script for Fit-With-AI
 * Tests all endpoints including signup, login, forgot password, and protected routes
 */

const https = require('https');
const http = require('http');
const querystring = require('querystring');

// Configuration
const BASE_URL = process.env.TEST_URL || 'https://fit-with-ai-1.vercel.app';
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'testpassword123';
const TEST_NAME = 'Test User';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Test results storage
const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Fit-With-AI-Test-Client/1.0',
                'Accept': 'application/json, text/html, */*',
                ...options.headers
            }
        };

        if (options.data) {
            const postData = typeof options.data === 'string' ? options.data : JSON.stringify(options.data);
            requestOptions.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
            requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = client.request(requestOptions, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data,
                    cookies: res.headers['set-cookie'] || []
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (options.data) {
            const postData = typeof options.data === 'string' ? options.data : JSON.stringify(options.data);
            req.write(postData);
        }

        req.end();
    });
}

// Helper function to extract cookies
function extractCookies(cookieHeaders) {
    const cookies = {};
    if (cookieHeaders) {
        cookieHeaders.forEach(cookie => {
            const [nameValue] = cookie.split(';');
            const [name, value] = nameValue.split('=');
            if (name && value) {
                cookies[name.trim()] = value.trim();
            }
        });
    }
    return cookies;
}

// Helper function to format cookies for requests
function formatCookies(cookies) {
    return Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
}

// Test logging functions
function logTest(testName, status, details = '') {
    testResults.total++;
    const statusColor = status === 'PASS' ? colors.green : colors.red;
    const statusSymbol = status === 'PASS' ? '✓' : '✗';
    
    console.log(`${statusColor}${statusSymbol} ${testName}${colors.reset}${details ? ` - ${details}` : ''}`);
    
    testResults.details.push({
        name: testName,
        status,
        details
    });
    
    if (status === 'PASS') {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
}

function logSection(sectionName) {
    console.log(`\n${colors.cyan}${colors.bright}=== ${sectionName} ===${colors.reset}`);
}

function logInfo(message) {
    console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function logError(message) {
    console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function logSuccess(message) {
    console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

// Test functions
async function testHealthCheck() {
    logSection('Health Check Tests');
    
    try {
        const response = await makeRequest(`${BASE_URL}/api/health`);
        
        if (response.statusCode === 200) {
            try {
                const data = JSON.parse(response.body);
                logTest('Health Check Endpoint', 'PASS', `Status: ${data.status}`);
                logInfo(`Environment: ${data.environment}`);
                logInfo(`Vercel: ${data.vercel ? 'Yes' : 'No'}`);
            } catch (e) {
                logTest('Health Check JSON Parse', 'FAIL', 'Invalid JSON response');
            }
        } else {
            logTest('Health Check Endpoint', 'FAIL', `Status: ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Health Check Endpoint', 'FAIL', `Error: ${error.message}`);
    }
}

async function testHomePage() {
    logSection('Home Page Tests');
    
    try {
        const response = await makeRequest(`${BASE_URL}/`);
        
        if (response.statusCode === 200) {
            logTest('Home Page Load', 'PASS', `Status: ${response.statusCode}`);
            
            // Check if it contains expected content
            if (response.body.includes('Fit-With-AI') || response.body.includes('fitness')) {
                logTest('Home Page Content', 'PASS', 'Contains expected content');
            } else {
                logTest('Home Page Content', 'FAIL', 'Missing expected content');
            }
        } else {
            logTest('Home Page Load', 'FAIL', `Status: ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Home Page Load', 'FAIL', `Error: ${error.message}`);
    }
}

async function testSignup() {
    logSection('Signup Tests');
    
    // Test signup with valid data
    try {
        const signupData = {
            fullName: TEST_NAME,
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        };
        
        const response = await makeRequest(`${BASE_URL}/signup`, {
            method: 'POST',
            data: signupData,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.statusCode === 200) {
            try {
                const data = JSON.parse(response.body);
                if (data.success) {
                    logTest('Signup with Valid Data', 'PASS', 'User created successfully');
                    logInfo(`Redirect URL: ${data.redirectUrl}`);
                    return extractCookies(response.cookies);
                } else {
                    logTest('Signup with Valid Data', 'FAIL', `Error: ${data.error}`);
                }
            } catch (e) {
                logTest('Signup JSON Parse', 'FAIL', 'Invalid JSON response');
            }
        } else {
            logTest('Signup with Valid Data', 'FAIL', `Status: ${response.statusCode}`);
            logError(`Response: ${response.body.substring(0, 200)}`);
        }
    } catch (error) {
        logTest('Signup with Valid Data', 'FAIL', `Error: ${error.message}`);
    }
    
    // Test signup with missing data
    try {
        const response = await makeRequest(`${BASE_URL}/signup`, {
            method: 'POST',
            data: { email: TEST_EMAIL },
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.statusCode === 400) {
            logTest('Signup with Missing Data', 'PASS', 'Correctly rejected incomplete data');
        } else {
            logTest('Signup with Missing Data', 'FAIL', `Expected 400, got ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Signup with Missing Data', 'FAIL', `Error: ${error.message}`);
    }
    
    // Test signup with duplicate email
    try {
        const signupData = {
            fullName: 'Another User',
            email: TEST_EMAIL,
            password: 'anotherpassword123'
        };
        
        const response = await makeRequest(`${BASE_URL}/signup`, {
            method: 'POST',
            data: signupData,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.statusCode === 409) {
            logTest('Signup with Duplicate Email', 'PASS', 'Correctly rejected duplicate email');
        } else {
            logTest('Signup with Duplicate Email', 'FAIL', `Expected 409, got ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Signup with Duplicate Email', 'FAIL', `Error: ${error.message}`);
    }
    
    return null;
}

async function testLogin() {
    logSection('Login Tests');
    
    // Test login with valid credentials
    try {
        const loginData = {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        };
        
        const response = await makeRequest(`${BASE_URL}/login`, {
            method: 'POST',
            data: loginData,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.statusCode === 200) {
            try {
                const data = JSON.parse(response.body);
                if (data.success) {
                    logTest('Login with Valid Credentials', 'PASS', 'Login successful');
                    logInfo(`Redirect URL: ${data.redirectUrl}`);
                    return extractCookies(response.cookies);
                } else {
                    logTest('Login with Valid Credentials', 'FAIL', `Error: ${data.error}`);
                }
            } catch (e) {
                logTest('Login JSON Parse', 'FAIL', 'Invalid JSON response');
            }
        } else {
            logTest('Login with Valid Credentials', 'FAIL', `Status: ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Login with Valid Credentials', 'FAIL', `Error: ${error.message}`);
    }
    
    // Test login with invalid credentials
    try {
        const loginData = {
            email: TEST_EMAIL,
            password: 'wrongpassword'
        };
        
        const response = await makeRequest(`${BASE_URL}/login`, {
            method: 'POST',
            data: loginData,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.statusCode === 401) {
            logTest('Login with Invalid Credentials', 'PASS', 'Correctly rejected invalid credentials');
        } else {
            logTest('Login with Invalid Credentials', 'FAIL', `Expected 401, got ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Login with Invalid Credentials', 'FAIL', `Error: ${error.message}`);
    }
    
    // Test login with missing data
    try {
        const response = await makeRequest(`${BASE_URL}/login`, {
            method: 'POST',
            data: { email: TEST_EMAIL },
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.statusCode === 400) {
            logTest('Login with Missing Data', 'PASS', 'Correctly rejected incomplete data');
        } else {
            logTest('Login with Missing Data', 'FAIL', `Expected 400, got ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Login with Missing Data', 'FAIL', `Error: ${error.message}`);
    }
    
    return null;
}

async function testForgotPassword() {
    logSection('Forgot Password Tests');
    
    // Test forgot password with valid email
    try {
        const response = await makeRequest(`${BASE_URL}/forgot-password`, {
            method: 'POST',
            data: { email: TEST_EMAIL },
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.statusCode === 200) {
            try {
                const data = JSON.parse(response.body);
                if (data.success) {
                    logTest('Forgot Password with Valid Email', 'PASS', 'Reset request processed');
                    return extractCookies(response.cookies);
                } else {
                    logTest('Forgot Password with Valid Email', 'FAIL', `Error: ${data.error}`);
                }
            } catch (e) {
                logTest('Forgot Password JSON Parse', 'FAIL', 'Invalid JSON response');
            }
        } else {
            logTest('Forgot Password with Valid Email', 'FAIL', `Status: ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Forgot Password with Valid Email', 'FAIL', `Error: ${error.message}`);
    }
    
    // Test forgot password with invalid email
    try {
        const response = await makeRequest(`${BASE_URL}/forgot-password`, {
            method: 'POST',
            data: { email: 'nonexistent@example.com' },
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Should still return success for security reasons
        if (response.statusCode === 200) {
            logTest('Forgot Password with Invalid Email', 'PASS', 'Handled gracefully for security');
        } else {
            logTest('Forgot Password with Invalid Email', 'FAIL', `Status: ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Forgot Password with Invalid Email', 'FAIL', `Error: ${error.message}`);
    }
    
    // Test forgot password with missing email
    try {
        const response = await makeRequest(`${BASE_URL}/forgot-password`, {
            method: 'POST',
            data: {},
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.statusCode === 400) {
            logTest('Forgot Password with Missing Email', 'PASS', 'Correctly rejected missing email');
        } else {
            logTest('Forgot Password with Missing Email', 'FAIL', `Expected 400, got ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Forgot Password with Missing Email', 'FAIL', `Error: ${error.message}`);
    }
    
    return null;
}

async function testProtectedRoutes(cookies) {
    logSection('Protected Routes Tests');
    
    const protectedRoutes = [
        '/dashboard',
        '/workouts',
        '/progress',
        '/meal-planner',
        '/nutrition',
        '/health',
        '/challenges',
        '/biometrics',
        '/schedule',
        '/community',
        '/ai-coach',
        '/settings'
    ];
    
    const cookieHeader = cookies ? formatCookies(cookies) : '';
    
    for (const route of protectedRoutes) {
        try {
            const response = await makeRequest(`${BASE_URL}${route}`, {
                headers: {
                    'Cookie': cookieHeader
                }
            });
            
            if (response.statusCode === 200) {
                logTest(`Protected Route ${route}`, 'PASS', 'Accessible with authentication');
            } else if (response.statusCode === 302 || response.statusCode === 301) {
                // Check if redirected to login/onboarding
                const location = response.headers.location;
                if (location && (location.includes('CustomOnboarding') || location === '/')) {
                    logTest(`Protected Route ${route}`, 'PASS', `Redirected to ${location}`);
                } else {
                    logTest(`Protected Route ${route}`, 'FAIL', `Unexpected redirect to ${location}`);
                }
            } else if (response.statusCode === 401) {
                logTest(`Protected Route ${route}`, 'PASS', 'Correctly requires authentication');
            } else {
                logTest(`Protected Route ${route}`, 'FAIL', `Status: ${response.statusCode}`);
            }
        } catch (error) {
            logTest(`Protected Route ${route}`, 'FAIL', `Error: ${error.message}`);
        }
    }
}

async function testOnboardingFlow(cookies) {
    logSection('Onboarding Flow Tests');
    
    const cookieHeader = cookies ? formatCookies(cookies) : '';
    
    // Test onboarding page access
    try {
        const response = await makeRequest(`${BASE_URL}/CustomOnboarding?email=${encodeURIComponent(TEST_EMAIL)}`, {
            headers: {
                'Cookie': cookieHeader
            }
        });
        
        if (response.statusCode === 200) {
            logTest('Onboarding Page Access', 'PASS', 'Page accessible');
        } else {
            logTest('Onboarding Page Access', 'FAIL', `Status: ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Onboarding Page Access', 'FAIL', `Error: ${error.message}`);
    }
    
    // Test onboarding completion
    try {
        const onboardingData = {
            personalInfo: {
                firstName: 'Test',
                lastName: 'User',
                age: 25,
                gender: 'male',
                height: 175,
                weight: 70
            },
            fitnessGoals: {
                primaryGoal: 'general-fitness',
                activityLevel: 'moderately-active',
                workoutFrequency: 3,
                fitnessExperience: 'beginner'
            },
            healthInfo: {
                medicalConditions: [],
                allergies: [],
                dietaryRestrictions: []
            },
            preferences: {
                workoutTime: 'morning',
                workoutDuration: 45,
                equipmentAccess: ['bodyweight']
            }
        };
        
        const response = await makeRequest(`${BASE_URL}/CustomOnboarding/complete`, {
            method: 'POST',
            data: { onboardingData },
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader
            }
        });
        
        if (response.statusCode === 200) {
            try {
                const data = JSON.parse(response.body);
                if (data.success) {
                    logTest('Onboarding Completion', 'PASS', 'Onboarding completed successfully');
                    logInfo(`Redirect URL: ${data.redirectUrl}`);
                } else {
                    logTest('Onboarding Completion', 'FAIL', `Error: ${data.error}`);
                }
            } catch (e) {
                logTest('Onboarding Completion JSON Parse', 'FAIL', 'Invalid JSON response');
            }
        } else {
            logTest('Onboarding Completion', 'FAIL', `Status: ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Onboarding Completion', 'FAIL', `Error: ${error.message}`);
    }
}

async function testStaticAssets() {
    logSection('Static Assets Tests');
    
    const staticAssets = [
        '/favicon.ico',
        '/robots.txt'
    ];
    
    for (const asset of staticAssets) {
        try {
            const response = await makeRequest(`${BASE_URL}${asset}`);
            
            if (response.statusCode === 200 || response.statusCode === 404) {
                logTest(`Static Asset ${asset}`, 'PASS', `Status: ${response.statusCode}`);
            } else {
                logTest(`Static Asset ${asset}`, 'FAIL', `Status: ${response.statusCode}`);
            }
        } catch (error) {
            logTest(`Static Asset ${asset}`, 'FAIL', `Error: ${error.message}`);
        }
    }
}

async function testErrorHandling() {
    logSection('Error Handling Tests');
    
    // Test 404 handling
    try {
        const response = await makeRequest(`${BASE_URL}/nonexistent-page`);
        
        if (response.statusCode === 404) {
            logTest('404 Error Handling', 'PASS', 'Returns 404 for non-existent pages');
        } else {
            logTest('404 Error Handling', 'FAIL', `Expected 404, got ${response.statusCode}`);
        }
    } catch (error) {
        logTest('404 Error Handling', 'FAIL', `Error: ${error.message}`);
    }
    
    // Test malformed JSON handling
    try {
        const response = await makeRequest(`${BASE_URL}/signup`, {
            method: 'POST',
            data: 'invalid json',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.statusCode === 400 || response.statusCode === 500) {
            logTest('Malformed JSON Handling', 'PASS', 'Handles malformed JSON gracefully');
        } else {
            logTest('Malformed JSON Handling', 'FAIL', `Status: ${response.statusCode}`);
        }
    } catch (error) {
        logTest('Malformed JSON Handling', 'FAIL', `Error: ${error.message}`);
    }
}

// Main test runner
async function runAllTests() {
    console.log(`${colors.bright}${colors.magenta}🧪 Fit-With-AI Endpoint Testing Suite${colors.reset}`);
    console.log(`${colors.blue}Testing URL: ${BASE_URL}${colors.reset}`);
    console.log(`${colors.blue}Test Email: ${TEST_EMAIL}${colors.reset}\n`);
    
    let sessionCookies = null;
    
    // Run tests in sequence
    await testHealthCheck();
    await testHomePage();
    
    // Authentication flow tests
    sessionCookies = await testSignup();
    await testLogin();
    await testForgotPassword();
    
    // If we have session cookies, test protected routes and onboarding
    if (sessionCookies) {
        await testOnboardingFlow(sessionCookies);
        await testProtectedRoutes(sessionCookies);
    } else {
        logInfo('Skipping protected routes tests - no session cookies available');
    }
    
    // Other tests
    await testStaticAssets();
    await testErrorHandling();
    
    // Print summary
    console.log(`\n${colors.bright}${colors.cyan}=== TEST SUMMARY ===${colors.reset}`);
    console.log(`${colors.green}✓ Passed: ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}✗ Failed: ${testResults.failed}${colors.reset}`);
    console.log(`${colors.blue}📊 Total: ${testResults.total}${colors.reset}`);
    
    const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
    console.log(`${colors.yellow}📈 Success Rate: ${successRate}%${colors.reset}`);
    
    if (testResults.failed > 0) {
        console.log(`\n${colors.red}${colors.bright}Failed Tests:${colors.reset}`);
        testResults.details
            .filter(test => test.status === 'FAIL')
            .forEach(test => {
                console.log(`${colors.red}  ✗ ${test.name}${colors.reset}${test.details ? ` - ${test.details}` : ''}`);
            });
    }
    
    console.log(`\n${colors.bright}Testing completed at ${new Date().toISOString()}${colors.reset}`);
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error(`${colors.red}Uncaught Exception: ${error.message}${colors.reset}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`${colors.red}Unhandled Rejection at: ${promise}, reason: ${reason}${colors.reset}`);
    process.exit(1);
});

// Run the tests
if (require.main === module) {
    runAllTests().catch(error => {
        console.error(`${colors.red}Test runner error: ${error.message}${colors.reset}`);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testHealthCheck,
    testHomePage,
    testSignup,
    testLogin,
    testForgotPassword,
    testProtectedRoutes,
    testOnboardingFlow,
    testStaticAssets,
    testErrorHandling
};