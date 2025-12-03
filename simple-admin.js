const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple in-memory session
let adminSession = null;

app.get('/', (req, res) => {
  if (adminSession) {
    return res.send(`
      <h1>Admin Dashboard</h1>
      <p>Welcome, ${adminSession.username}!</p>
      <p>Time: ${new Date()}</p>
      <a href="/logout">Logout</a>
    `);
  }
  
  res.send(`
    <h1>Admin Login</h1>
    <form method="POST" action="/login">
      <input type="text" name="username" placeholder="Username" required><br><br>
      <input type="password" name="password" placeholder="Password" required><br><br>
      <button type="submit">Login</button>
    </form>
    <p>Use: admin / admin123</p>
  `);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    adminSession = { username: 'admin', loginTime: new Date() };
    return res.redirect('/');
  }
  
  res.send('<h1>Login Failed</h1><a href="/">Try Again</a>');
});

app.get('/logout', (req, res) => {
  adminSession = null;
  res.redirect('/');
});

const PORT = 3011;
app.listen(PORT, () => {
  console.log(`Simple Admin running on http://localhost:${PORT}`);
});