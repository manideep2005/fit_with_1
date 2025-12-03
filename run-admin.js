const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

let isLoggedIn = false;

app.get('/', (req, res) => {
  if (isLoggedIn) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Admin Dashboard</title></head>
      <body style="font-family: Arial; padding: 20px;">
        <h1>✅ Admin Dashboard Working!</h1>
        <p>Login successful at: ${new Date()}</p>
        <div style="margin: 20px 0;">
          <h3>Quick Stats:</h3>
          <p>• Total Users: 150</p>
          <p>• Active Sessions: 25</p>
          <p>• System Status: Online</p>
        </div>
        <a href="/logout" style="color: red;">Logout</a>
      </body>
      </html>
    `);
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Admin Login</title></head>
    <body style="font-family: Arial; padding: 20px; background: #f5f5f5;">
      <div style="max-width: 400px; margin: 100px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <h2>🔐 Admin Login</h2>
        <form method="POST" action="/login">
          <div style="margin: 15px 0;">
            <input type="text" name="username" placeholder="Username" required 
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
          </div>
          <div style="margin: 15px 0;">
            <input type="password" name="password" placeholder="Password" required
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
          </div>
          <button type="submit" style="width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Login
          </button>
        </form>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          <strong>Credentials:</strong><br>
          Username: admin<br>
          Password: admin123
        </p>
      </div>
    </body>
    </html>
  `);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', username, password);
  
  if (username === 'admin' && password === 'admin123') {
    isLoggedIn = true;
    console.log('✅ Login successful');
    return res.redirect('/');
  }
  
  console.log('❌ Login failed');
  res.send(`
    <h1 style="color: red;">❌ Login Failed</h1>
    <p>Invalid credentials. <a href="/">Try Again</a></p>
  `);
});

app.get('/logout', (req, res) => {
  isLoggedIn = false;
  console.log('User logged out');
  res.redirect('/');
});

const PORT = 3011;
app.listen(PORT, () => {
  console.log('🚀 Admin Panel Started!');
  console.log(`📱 Open: http://localhost:${PORT}`);
  console.log('🔑 Login: admin / admin123');
});