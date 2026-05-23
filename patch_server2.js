const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

const apiEndpoints = `
// ─── USER MANAGEMENT API (MongoDB) ───────────────────────────────────────────
app.post('/api/users', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

`;

// Insert api endpoints right before app.post('/api/analyze'
serverCode = serverCode.replace(/app\.post\('\/api\/analyze'/g, apiEndpoints + "app.post('/api/analyze'");

fs.writeFileSync('server.js', serverCode);
console.log('Successfully injected API endpoints into server.js');
