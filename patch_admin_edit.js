const fs = require('fs');
let code = fs.readFileSync('js/adminModule.js', 'utf8');

// The new editUser function with full HTML Modal
const newEditUser = `
window.editUser = async function(userId) {
  try {
    const res = await fetch('/api/users');
    const users = await res.json();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      showToast('User not found', 'error');
      return;
    }

    const modalHtml = \`
      <div id="editModal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;">
        <div style="background:#112236;border-radius:20px;padding:32px;max-width:500px;width:100%;box-shadow:0 20px 40px rgba(0,0,0,0.4);border:1px solid var(--border);max-height:90vh;overflow-y:auto;">
          <h2 style="margin:0 0 24px;color:#fff;font-size:24px;">Edit User Details</h2>
          
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label>Full Name</label>
              <input type="text" id="editName" value="\${user.name || ''}" placeholder="Full Name" />
            </div>
            <div class="form-group" style="flex:1;">
              <label>Username</label>
              <input type="text" id="editUsername" value="\${user.username || ''}" placeholder="Username" />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label>Password (leave empty to keep)</label>
              <input type="text" id="editPassword" placeholder="New Password" />
            </div>
            <div class="form-group" style="flex:1;">
              <label>Specialty</label>
              <input type="text" id="editSpecialty" value="\${user.specialty || ''}" placeholder="Specialty" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label>Email ID</label>
              <input type="email" id="editEmail" value="\${user.email || ''}" placeholder="Email Address" />
            </div>
            <div class="form-group" style="flex:1;">
              <label>Mobile No</label>
              <input type="text" id="editMobile" value="\${user.mobile || ''}" placeholder="Mobile Number" />
            </div>
          </div>

          <div class="form-group">
            <label>Address</label>
            <input type="text" id="editAddress" value="\${user.address || ''}" placeholder="Full Address" />
          </div>

          <div style="display:flex;gap:12px;margin-top:24px;">
            <button class="btn-primary" style="flex:1;" onclick="saveUserEdit('\${userId}')">Save Changes</button>
            <button class="btn-primary" style="flex:1;background:#334155;" onclick="document.getElementById('editModal').remove()">Cancel</button>
          </div>
        </div>
      </div>
    \`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  } catch(e) {
    showToast('Failed to load user data', 'error');
  }
};

window.saveUserEdit = async function(userId) {
  const payload = {};
  
  const name = document.getElementById('editName').value.trim();
  const username = document.getElementById('editUsername').value.trim();
  const password = document.getElementById('editPassword').value.trim();
  const specialty = document.getElementById('editSpecialty').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  const mobile = document.getElementById('editMobile').value.trim();
  const address = document.getElementById('editAddress').value.trim();

  if (name) payload.name = name;
  if (username) payload.username = username;
  if (password) payload.password = password;
  if (specialty !== undefined) payload.specialty = specialty;
  if (email !== undefined) payload.email = email;
  if (mobile !== undefined) payload.mobile = mobile;
  if (address !== undefined) payload.address = address;

  try {
    const res = await fetch(\`/api/users/\${userId}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast('User updated successfully', 'success');
      document.getElementById('editModal').remove();
      if (typeof renderDoctorsTable === 'function') renderDoctorsTable();
      if (typeof renderResearchersTable === 'function') renderResearchersTable();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to update user', 'error');
    }
  } catch (err) {
    showToast('Network error while updating user', 'error');
  }
};
`;

// Extract the old editUser and replace it
const oldEditRegex = /window\.editUser = async function\(userId\) \{[\s\S]*?catch \(err\) \{[\s\S]*?showToast\('Network error while updating user', 'error'\);\s*\}\s*\};/;
code = code.replace(oldEditRegex, newEditUser);

fs.writeFileSync('js/adminModule.js', code);
console.log('adminModule.js edit form patched successfully!');
