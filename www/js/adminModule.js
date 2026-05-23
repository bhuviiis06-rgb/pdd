/**
 * DentAI – Admin Module
 * Handles platform analytics, user management, and activity logs.
 */

const AdminModule = (() => {

  function renderDashboard() {
    const stats = DB.getPlatformStats();
    
    // Update Stat Cards
    document.getElementById('adTotalUsers').textContent = stats.totalUsers;
    document.getElementById('adTotalPatients').textContent = stats.totalPatients;
    document.getElementById('adTotalScans').textContent = stats.totalScans;
    document.getElementById('adAvgDmft').textContent = stats.avgDmft;
    document.getElementById('adTotalNotes').textContent = stats.totalResearchNotes;

    renderUsersTable();
    renderLogsTable(stats.recentLogs);
  }

  function renderUsersTable() {
    const users = DB.getAllUsers();
    const tbody = document.getElementById('adUsersTable');
    tbody.innerHTML = '';
    
    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${u.username}</strong></td>
        <td>${u.name}</td>
        <td><span class="status-badge ${u.role === 'admin' ? 'decayed' : u.role === 'doctor' ? 'filled' : 'healthy'}">${u.role.toUpperCase()}</span></td>
        <td>${u.specialty}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderLogsTable(logs) {
    const tbody = document.getElementById('adLogsTable');
    tbody.innerHTML = '';
    
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">No system activity yet.</td></tr>';
      return;
    }

    logs.forEach(log => {
      const d = new Date(log.timestamp);
      const timeStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${timeStr}</td>
        <td><span class="pc-badge" style="background:rgba(255,255,255,0.05)">${log.action}</span></td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${log.userId}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  return { renderDashboard };
})();

// --- User Management Logic ---
window.switchAdminTab = function(tabId) {
  // reset buttons
  const buttons = document.querySelectorAll('#moduleAdmin .res-tab-btn');
  buttons.forEach(b => b.classList.remove('active'));
  if (event) event.currentTarget.classList.add('active');

  // hide all
  document.getElementById('adminTabCreate').classList.add('hidden');
  document.getElementById('adminTabDoctors').classList.add('hidden');
  document.getElementById('adminTabResearchers').classList.add('hidden');
  document.getElementById('adminTabDashboard').classList.add('hidden');

  // show selected
  if (tabId === 'create') document.getElementById('adminTabCreate').classList.remove('hidden');
  if (tabId === 'doctors') {
    document.getElementById('adminTabDoctors').classList.remove('hidden');
    renderDoctorsTable();
  }
  if (tabId === 'researchers') {
    document.getElementById('adminTabResearchers').classList.remove('hidden');
    renderResearchersTable();
  }
  if (tabId === 'dashboard') {
    document.getElementById('adminTabDashboard').classList.remove('hidden');
    // renderAdminDashboard is still defined in app.js and gets called on routeUser, but we can call it again
    if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
  }
};

window.updateSpecialtyLabel = function() {
  const role = document.getElementById('cuRole').value;
  const label = document.getElementById('cuSpecialtyLabel');
  const input = document.getElementById('cuSpecialty');
  if (role === 'doctor') {
    label.textContent = 'Specialty';
    input.placeholder = 'e.g. Endodontics';
  } else {
    label.textContent = 'Department';
    input.placeholder = 'e.g. Epidemiological Studies';
  }
};

window.handleCreateUser = async function(e) {
  e.preventDefault();
  const firstName = document.getElementById('cuFirstName').value.trim();
  const lastName = document.getElementById('cuLastName').value.trim();
  const dob = document.getElementById('cuDOB').value;
  const gender = document.getElementById('cuGender').value;
  const mobile = document.getElementById('cuMobile').value.trim();
  const email = document.getElementById('cuEmail').value.trim();
  const address = document.getElementById('cuAddress').value.trim();
  const role = document.getElementById('cuRole').value;
  const username = document.getElementById('cuUsername').value.trim();
  const password = document.getElementById('cuPassword').value.trim();

  const newUser = {
    id: 'usr_' + Date.now().toString(36),
    firstName,
    lastName,
    name: firstName + ' ' + lastName, // Computed for legacy support
    dob,
    gender,
    mobile,
    email,
    address,
    username, 
    password, 
    role, 
    specialty: ''
  };

  try {
    const res = await fetch('https://dentai-backend-5gi6.onrender.com/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      return alert('Error: ' + errorData.error);
    }
    
    alert('User created securely in MongoDB! They can now log in.');
    document.getElementById('adminCreateUserForm').reset();
    
    // Refresh tables if currently visible
    if (!document.getElementById('adminTabDoctors').classList.contains('hidden')) renderDoctorsTable();
    if (!document.getElementById('adminTabResearchers').classList.contains('hidden')) renderResearchersTable();
    
  } catch (err) {
    alert('Failed to connect to database: ' + err.message);
  }
};

window.renderDoctorsTable = async function() {
  const tbody = document.getElementById('adDoctorsTable');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5">Loading from MongoDB...</td></tr>';
  
  try {
    const res = await fetch('https://dentai-backend-5gi6.onrender.com/api/users');
    const users = await res.json();
    const doctors = users.filter(u => u.role === 'doctor');
    
    tbody.innerHTML = '';
    doctors.forEach(u => {
      const statusClass = (u.status || 'active') === 'active' ? 'status-active' : 'status-suspended';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${u.name}</strong></td>
        <td style="color:var(--text-secondary)">@${u.username}</td>
        <td style="font-family:monospace; color:var(--pink);">${u.password}</td>
        <td>${u.specialty || '-'}</td>
        <td><span class="status-badge ${statusClass}">${u.status || 'active'}</span></td>
        <td style="display:flex; gap:8px;">
          <button class="action-btn report-btn" onclick="reportUser('${u.id}')">📊 Report</button>
          <button class="action-btn edit-btn" onclick="editUser('${u.id}')">✏️ Edit</button>
          <button class="action-btn suspend-btn" onclick="suspendUser('${u.id}')">${(u.status || 'active') === 'suspended' ? '▶ Activate' : '⏸ Suspend'}</button>
          <button class="action-btn delete-btn" onclick="deleteUser('${u.id}')">🗑 Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:red;">Error loading from MongoDB</td></tr>';
  }
}

window.renderResearchersTable = async function() {
  const tbody = document.getElementById('adResearchersTable');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5">Loading from MongoDB...</td></tr>';
  
  try {
    const res = await fetch('https://dentai-backend-5gi6.onrender.com/api/users');
    const users = await res.json();
    const researchers = users.filter(u => u.role === 'researcher');
    
    tbody.innerHTML = '';
    researchers.forEach(u => {
      const statusClass = (u.status || 'active') === 'active' ? 'status-active' : 'status-suspended';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${u.name}</strong></td>
        <td style="color:var(--text-secondary)">@${u.username}</td>
        <td style="font-family:monospace; color:var(--pink);">${u.password}</td>
        <td>${u.specialty || '-'}</td>
        <td><span class="status-badge ${statusClass}">${u.status || 'active'}</span></td>
        <td style="display:flex; gap:8px;">
          <button class="action-btn report-btn" onclick="reportUser('${u.id}')">📊 Report</button>
          <button class="action-btn edit-btn" onclick="editUser('${u.id}')">✏️ Edit</button>
          <button class="action-btn suspend-btn" onclick="suspendUser('${u.id}')">${(u.status || 'active') === 'suspended' ? '▶ Activate' : '⏸ Suspend'}</button>
          <button class="action-btn delete-btn" onclick="deleteUser('${u.id}')">🗑 Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:red;">Error loading from MongoDB</td></tr>';
  }
}



window.deleteUser = async function(id) {
  if (!confirm('Are you sure you want to permanently delete this user?')) return;
  try {
    const res = await fetch(`https://dentai-backend-5gi6.onrender.com/api/users/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    if (!document.getElementById('adminTabDoctors').classList.contains('hidden')) renderDoctorsTable();
    if (!document.getElementById('adminTabResearchers').classList.contains('hidden')) renderResearchersTable();
  } catch(err) { alert(err.message); }
};

window.suspendUser = async function(id) {
  try {
    const resCheck = await fetch('https://dentai-backend-5gi6.onrender.com/api/users');
    const users = await resCheck.json();
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    let reason = '';
    if (user.status !== 'suspended') {
      reason = prompt('Enter a reason for suspending this user:');
      if (reason === null) return; // User cancelled
    }

    const res = await fetch(`https://dentai-backend-5gi6.onrender.com/api/users/${id}/suspend`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error('Failed to update status');
    if (!document.getElementById('adminTabDoctors').classList.contains('hidden')) renderDoctorsTable();
    if (!document.getElementById('adminTabResearchers').classList.contains('hidden')) renderResearchersTable();
  } catch(err) { alert(err.message); }
};



window.reportUser = function(userId) {
  try {
    const patientsCount = DB.getPatientsByDoctor(userId).length;
    const scansCount = DB.getScansByDoctor(userId).length;
    
    // Create a beautiful custom modal using SweetAlert-like syntax but pure HTML/CSS
    const modalHtml = `
      <div id="reportModal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;">
        <div style="background:#112236;border-radius:20px;padding:32px;max-width:400px;width:100%;box-shadow:0 20px 40px rgba(0,0,0,0.4);border:1px solid var(--border);">
          <h2 style="margin:0 0 16px;color:#fff;font-size:24px;">Doctor Report</h2>
          <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:12px;">
            <p style="margin:0 0 8px;color:var(--text-secondary);font-size:14px;">Total Patients Visited</p>
            <p style="margin:0;color:#fff;font-size:28px;font-weight:700;">${patientsCount}</p>
          </div>
          <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:24px;">
            <p style="margin:0 0 8px;color:var(--text-secondary);font-size:14px;">Total Analyses Performed</p>
            <p style="margin:0;color:#fff;font-size:28px;font-weight:700;">${scansCount}</p>
          </div>
          <button class="btn-primary btn-full" onclick="document.getElementById('reportModal').remove()">Close Report</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  } catch(e) {
    console.error(e);
    alert('Error generating report.');
  }
};


window.editUser = async function(userId) {
  try {
    const res = await fetch('https://dentai-backend-5gi6.onrender.com/api/users');
    const users = await res.json();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      showToast('User not found', 'error');
      return;
    }

    const modalHtml = `
      <div id="editModal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;">
        <div style="background:#112236;border-radius:20px;padding:32px;max-width:500px;width:100%;box-shadow:0 20px 40px rgba(0,0,0,0.4);border:1px solid var(--border);max-height:90vh;overflow-y:auto;">
          <h2 style="margin:0 0 24px;color:#fff;font-size:24px;">Edit User Details</h2>
          
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label>Full Name</label>
              <input type="text" id="editName" value="${user.name || ''}" placeholder="Full Name" />
            </div>
            <div class="form-group" style="flex:1;">
              <label>Username</label>
              <input type="text" id="editUsername" value="${user.username || ''}" placeholder="Username" />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label>Password (leave empty to keep)</label>
              <input type="text" id="editPassword" placeholder="New Password" />
            </div>
            <div class="form-group" style="flex:1;">
              <label>Specialty</label>
              <input type="text" id="editSpecialty" value="${user.specialty || ''}" placeholder="Specialty" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label>Email ID</label>
              <input type="email" id="editEmail" value="${user.email || ''}" placeholder="Email Address" />
            </div>
            <div class="form-group" style="flex:1;">
              <label>Mobile No</label>
              <input type="text" id="editMobile" value="${user.mobile || ''}" placeholder="Mobile Number" />
            </div>
          </div>

          <div class="form-group">
            <label>Address</label>
            <input type="text" id="editAddress" value="${user.address || ''}" placeholder="Full Address" />
          </div>

          <div style="display:flex;gap:12px;margin-top:24px;">
            <button class="btn-primary" style="flex:1;" onclick="saveUserEdit('${userId}')">Save Changes</button>
            <button class="btn-primary" style="flex:1;background:#334155;" onclick="document.getElementById('editModal').remove()">Cancel</button>
          </div>
        </div>
      </div>
    `;
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
    const res = await fetch(`https://dentai-backend-5gi6.onrender.com/api/users/${userId}`, {
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


