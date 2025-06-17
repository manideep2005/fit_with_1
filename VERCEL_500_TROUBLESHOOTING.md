# Vercel 500 Error Troubleshooting Guide

## 🔧 Fixes Applied

### 1. **Fixed Syntax Errors**
- ✅ Fixed missing commas in function parameters
- ✅ Fixed missing commas in JSON objects
- ✅ Fixed arrow function syntax
- ✅ Added proper serverless environment detection

### 2. **Updated Vercel Configuration**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.js"
    }
  ]
}
```

### 3. **Created Debug Endpoints**
- `/api/health` - Basic health check
- `/api/debug` - Environment variable check (dev only)

## 🚀 Deployment Steps

### 1. **Environment Variables**
Make sure these are set in Vercel Dashboard:
```
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
```

### 2. **Deploy Command**
```bash
vercel --prod
```

### 3. **Test Endpoints After Deployment**
```bash
# Health check
curl https://your-domain.vercel.app/api/health

# Debug info (if enabled)
curl https://your-domain.vercel.app/api/debug

# Main app
curl https://your-domain.vercel.app/
```

## 🐛 Common 500 Error Causes & Solutions

### **1. Environment Variables Missing**
**Symptoms:** App crashes on startup
**Solution:** 
- Check Vercel Dashboard → Project → Settings → Environment Variables
- Ensure all required variables are set
- Redeploy after adding variables

### **2. MongoDB Connection Issues**
**Symptoms:** Database connection errors
**Solutions:**
- Verify MONGODB_URI is correct
- Check MongoDB Atlas network access (whitelist 0.0.0.0/0 for Vercel)
- Ensure database user has proper permissions

### **3. Session Store Issues**
**Symptoms:** Session-related errors
**Note:** Using MemoryStore (not recommended for production)
**Solution:** Consider using Redis or database sessions for production

### **4. Import/Require Errors**
**Symptoms:** Module not found errors
**Solutions:**
- Check all file paths are correct
- Ensure all dependencies are in package.json
- Verify case-sensitive file names

### **5. Serverless Function Timeout**
**Symptoms:** Function times out
**Solutions:**
- Optimize database queries
- Add connection pooling
- Reduce cold start time

## 🔍 Debugging Steps

### **Step 1: Check Function Logs**
1. Go to Vercel Dashboard
2. Select your project
3. Go to "Functions" tab
4. Check logs for error details

### **Step 2: Test Health Endpoint**
```bash
curl https://your-domain.vercel.app/api/health
```
Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "vercel": true,
  "message": "Fit-With-AI API is running"
}
```

### **Step 3: Check Environment Variables**
```bash
curl https://your-domain.vercel.app/api/debug
```
(Only works if ENABLE_DEBUG=true is set)

### **Step 4: Test Local vs Production**
```bash
# Test locally
npm start

# Compare with production behavior
```

## 🛠️ Quick Fixes

### **If MongoDB Connection Fails:**
```javascript
// Add to environment variables
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### **If Session Errors:**
```javascript
// Temporary fix: Add to environment variables
SESSION_SECRET=your-very-long-random-string-here
```

### **If Email Service Fails:**
```javascript
// Add to environment variables
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-specific-password
```

## 📞 Next Steps

1. **Deploy with fixes:**
   ```bash
   vercel --prod
   ```

2. **Test health endpoint immediately:**
   ```bash
   curl https://your-domain.vercel.app/api/health
   ```

3. **Check function logs in Vercel Dashboard**

4. **Test password reset functionality:**
   - Go to your site
   - Try the forgot password flow
   - Check email delivery

5. **Monitor for any remaining issues**

## 🎯 Expected Results

After applying these fixes:
- ✅ No more 500 errors on basic routes
- ✅ Health endpoint returns 200 OK
- ✅ Password reset emails work
- ✅ Database connections succeed
- ✅ All authentication flows work

If you still get 500 errors after these fixes, check the Vercel function logs for specific error messages and let me know what you find!