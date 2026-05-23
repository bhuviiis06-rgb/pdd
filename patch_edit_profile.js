const fs = require('fs');

// 1. Patch models/User.js
let userModel = fs.readFileSync('models/User.js', 'utf8');
if (!userModel.includes('passwordChanged')) {
  userModel = userModel.replace("status: { type: String, default: 'active' },", "status: { type: String, default: 'active' },\n  passwordChanged: { type: Boolean, default: false },");
  fs.writeFileSync('models/User.js', userModel);
}

// 2. Patch server.js
let serverJS = fs.readFileSync('server.js', 'utf8');
const passwordEndpoint = `
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
});
`;
if (!serverJS.includes('/api/users/:id/password')) {
  serverJS = serverJS.replace("app.put('/api/users/:id/suspend'", passwordEndpoint + "\napp.put('/api/users/:id/suspend'");
  fs.writeFileSync('server.js', serverJS);
}

// 3. Patch index.html
let html = fs.readFileSync('index.html', 'utf8');

// Inject Password Column into Tables
html = html.replace('<th>Username</th><th>Specialty</th>', '<th>Username</th><th>Password</th><th>Specialty</th>');
html = html.replace('<th>Username</th><th>Department</th>', '<th>Username</th><th>Password</th><th>Department</th>');

// Inject Edit Profile Modal
const editProfileModalHTML = `
  <!-- ====== EDIT PROFILE MODAL ====== -->
  <div class="modal hidden" id="modalEditProfile">
    <div class="modal-content" style="max-width: 400px; padding: 24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
        <h3 style="margin:0; font-size:18px; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
          <span>✏️</span> Edit Profile
        </h3>
        <button class="btn-icon" onclick="closeEditProfileModal()">✕</button>
      </div>
      
      <div id="epContainer">
        <p style="font-size:14px; color:var(--text-secondary); margin-bottom: 16px;">
          For security reasons, you may only change your assigned password <strong>one time</strong>. Make sure you remember it!
        </p>
        
        <div class="form-group" style="margin-bottom: 24px;">
          <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">New Password</label>
          <input type="text" id="epNewPassword" placeholder="Enter new password" style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary);" />
        </div>
        
        <div style="display:flex; justify-content:flex-end; gap: 12px;">
          <button class="btn-ghost" onclick="closeEditProfileModal()">Cancel</button>
          <button class="btn-primary" onclick="submitPasswordChange()">Change Password</button>
        </div>
      </div>

      <div id="epLockedContainer" class="hidden">
        <div style="padding: 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; color: #ef4444; font-size: 14px; text-align: center;">
          🔒 You have already changed your password. For further changes, please contact the Platform Admin.
        </div>
        <div style="margin-top: 24px; text-align: right;">
          <button class="btn-ghost" onclick="closeEditProfileModal()">Close</button>
        </div>
      </div>

    </div>
  </div>
`;
if (!html.includes('id="modalEditProfile"')) {
  html = html.replace('</body>', editProfileModalHTML + '\n</body>');
}
fs.writeFileSync('index.html', html);


// 4. Patch js/adminModule.js
let adminJS = fs.readFileSync('js/adminModule.js', 'utf8');
adminJS = adminJS.replace(/<td style="color:var\(--text-secondary\)">@\$\{u\.username\}<\/td>/g, '<td style="color:var(--text-secondary)">@${u.username}</td>\n        <td style="font-family:monospace; color:var(--pink);">${u.password}</td>');
fs.writeFileSync('js/adminModule.js', adminJS);


// 5. Patch js/app.js
let appJS = fs.readFileSync('js/app.js', 'utf8');
appJS = appJS.replace(/onclick="event\.preventDefault\(\); alert\('Edit Profile coming soon'\)"/, 'onclick="event.preventDefault(); openEditProfileModal()"');

const editProfileLogic = `
window.openEditProfileModal = function() {
  const user = AuthManager.getUser();
  if (!user) return;
  
  const dropdown = document.getElementById('userProfileDropdown');
  if (dropdown) dropdown.classList.add('hidden');
  
  document.getElementById('epNewPassword').value = '';
  
  if (user.passwordChanged) {
    document.getElementById('epContainer').classList.add('hidden');
    document.getElementById('epLockedContainer').classList.remove('hidden');
  } else {
    document.getElementById('epContainer').classList.remove('hidden');
    document.getElementById('epLockedContainer').classList.add('hidden');
  }
  
  document.getElementById('modalEditProfile').classList.remove('hidden');
};

window.closeEditProfileModal = function() {
  document.getElementById('modalEditProfile').classList.add('hidden');
};

window.submitPasswordChange = async function() {
  const user = AuthManager.getUser();
  if (!user) return;
  const newPass = document.getElementById('epNewPassword').value.trim();
  if (!newPass) return alert('Please enter a new password');
  
  try {
    const res = await fetch(\`http://localhost:3000/api/users/\${user.id}/password\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: newPass })
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    
    const updatedUser = await res.json();
    // Update local storage/session storage to reflect the lock
    sessionStorage.setItem('dentai_current_user', JSON.stringify(updatedUser));
    
    showToast('Password successfully changed!', 'success');
    closeEditProfileModal();
    
  } catch (err) {
    alert('Failed to change password: ' + err.message);
  }
};
`;

if (!appJS.includes('openEditProfileModal')) {
  appJS += '\n' + editProfileLogic;
}
fs.writeFileSync('js/app.js', appJS);

console.log('Successfully patched One-Time Password features!');
