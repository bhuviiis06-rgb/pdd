const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

const mongooseImport = `
const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dentai')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));
`;

const apiEndpoints = `
// ─── USER MANAGEMENT API (MongoDB) ───────────────────────────────────────────
app.post('/api/users', async (req, res) => {
  try {
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
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
`;

// Insert mongoose import after other requires
serverCode = serverCode.replace(/const path = require\('path'\);\n/, "const path = require('path');\n" + mongooseImport + "\n");

// Insert api endpoints before the OPG endpoint
serverCode = serverCode.replace(/\/\/ ─── OPG Analysis Endpoint ───/, apiEndpoints + "\n// ─── OPG Analysis Endpoint ───");

fs.writeFileSync('server.js', serverCode);
console.log('Patched server.js with MongoDB and User APIs');
