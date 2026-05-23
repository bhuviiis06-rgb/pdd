const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

const actionEndpoints = `
app.delete('/api/users/:id', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const result = await User.findOneAndDelete({ id: req.params.id });
    if (!result) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/suspend', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const user = await User.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Toggle status
    user.status = user.status === 'suspended' ? 'active' : 'suspended';
    await user.save();
    
    res.json({ success: true, status: user.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

`;

// Insert action endpoints after app.get('/api/users'
serverCode = serverCode.replace(/app\.post\('\/api\/auth\/login'/g, actionEndpoints + "app.post('/api/auth/login'");

fs.writeFileSync('server.js', serverCode);
console.log('Successfully injected action endpoints into server.js');
