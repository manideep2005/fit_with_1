const express = require('express');
const app = express();

// Simple admin test
app.get('/admin/simple-test', (req, res) => {
  res.send(`
    <h1>Admin Test Working!</h1>
    <p>Time: ${new Date()}</p>
    <a href="/admin/dashboard">Go to Dashboard</a>
  `);
});

app.get('/admin/dashboard', (req, res) => {
  res.send(`
    <h1>Admin Dashboard</h1>
    <p>You are logged in as admin</p>
    <p>Time: ${new Date()}</p>
  `);
});

const PORT = 3010;
app.listen(PORT, () => {
  console.log(`Simple admin test server running on http://localhost:${PORT}`);
  console.log(`Test URL: http://localhost:${PORT}/admin/simple-test`);
});