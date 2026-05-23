const fs = require('fs');

// 1. Patch server.js
let serverJS = fs.readFileSync('server.js', 'utf8');

const oldEndpoint = `
app.put('/api/users/:id/password', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const user = await User.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.passwordChanged) return res.status(400).json({ error: 'Password has already been changed once' });
    
    user.password = req.body.newPassword;
    user.passwordChanged = true;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});`;

const newEndpoint = `
app.put('/api/users/:id/password', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const user = await User.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.passwordChanged) return res.status(400).json({ error: 'Password has already been changed once' });
    if (user.password !== req.body.oldPassword) return res.status(401).json({ error: 'Incorrect old password' });
    
    user.password = req.body.newPassword;
    user.passwordChanged = true;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});`;

if (serverJS.includes("user.passwordChanged = true;")) {
  serverJS = serverJS.replace(oldEndpoint, newEndpoint);
  fs.writeFileSync('server.js', serverJS);
}

// 2. Patch index.html
let html = fs.readFileSync('index.html', 'utf8');
const oldHTML = `<div class="form-group" style="margin-bottom: 24px;">
          <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">New Password</label>
          <input type="text" id="epNewPassword" placeholder="Enter new password" style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary);" />
        </div>`;
const newHTML = `<div class="form-group" style="margin-bottom: 16px;">
          <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">Old Password</label>
          <input type="password" id="epOldPassword" placeholder="Enter current password" style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary);" />
        </div>

        <div class="form-group" style="margin-bottom: 24px;">
          <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">New Password</label>
          <input type="password" id="epNewPassword" placeholder="Enter new password" style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary);" />
        </div>`;
if (html.includes('id="epNewPassword"')) {
  html = html.replace(oldHTML, newHTML);
  fs.writeFileSync('index.html', html);
}

// 3. Patch js/app.js
let appJS = fs.readFileSync('js/app.js', 'utf8');

const oldLogic = `window.submitPasswordChange = async function() {
  const user = AuthManager.getUser();
  if (!user) return;
  const newPass = document.getElementById('epNewPassword').value.trim();
  if (!newPass) return alert('Please enter a new password');
  
  try {
    const res = await fetch('http://localhost:3000/api/users/' + user.id + '/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: newPass })
    });`;

const newLogic = `window.submitPasswordChange = async function() {
  const user = AuthManager.getUser();
  if (!user) return;
  const oldPass = document.getElementById('epOldPassword').value.trim();
  const newPass = document.getElementById('epNewPassword').value.trim();
  if (!oldPass) return alert('Please enter your current password');
  if (!newPass) return alert('Please enter a new password');
  
  try {
    const res = await fetch('http://localhost:3000/api/users/' + user.id + '/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
    });`;

appJS = appJS.replace(oldLogic, newLogic);
appJS = appJS.replace("document.getElementById('epNewPassword').value = '';", "const epOld = document.getElementById('epOldPassword'); if(epOld) epOld.value = '';\n  document.getElementById('epNewPassword').value = '';");

fs.writeFileSync('js/app.js', appJS);

console.log('Successfully patched old password verification!');
