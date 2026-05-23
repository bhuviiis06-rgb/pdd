const fs = require('fs');

// 1. Update index.html
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(
  /<thead><tr><th>Name<\/th><th>Username<\/th><th>Specialty<\/th><th>Email<\/th><\/tr><\/thead>/,
  '<thead><tr><th>Name</th><th>Username</th><th>Specialty</th><th>Status</th><th>Actions</th></tr></thead>'
);
html = html.replace(
  /<thead><tr><th>Name<\/th><th>Username<\/th><th>Department<\/th><th>Email<\/th><\/tr><\/thead>/,
  '<thead><tr><th>Name</th><th>Username</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>'
);
fs.writeFileSync('index.html', html);

// 2. Inject CSS into index.html
if (!html.includes('.action-btn')) {
  const cssBlock = `
  <style>
  /* Table Action Buttons & Badges */
  .action-btn {
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: white;
    transition: opacity 0.2s;
  }
  .action-btn:hover { opacity: 0.8; }
  .report-btn { background: #374151; }
  .edit-btn { background: #374151; }
  .suspend-btn { background: #f59e0b; }
  .delete-btn { background: #ef4444; }

  .status-badge.status-active { background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 4px 8px; border-radius: 12px; font-size:11px; text-transform:lowercase; }
  .status-badge.status-suspended { background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 4px 8px; border-radius: 12px; font-size:11px; text-transform:lowercase; }
  </style>
  `;
  html = html.replace(/<\/head>/i, cssBlock + '\n</head>');
  fs.writeFileSync('index.html', html);
}


// 3. Update js/adminModule.js
let js = fs.readFileSync('js/adminModule.js', 'utf8');

const actionsLogic = `
window.deleteUser = async function(id) {
  if (!confirm('Are you sure you want to permanently delete this user?')) return;
  try {
    const res = await fetch(\`http://localhost:3000/api/users/\${id}\`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    if (!document.getElementById('adminTabDoctors').classList.contains('hidden')) renderDoctorsTable();
    if (!document.getElementById('adminTabResearchers').classList.contains('hidden')) renderResearchersTable();
  } catch(err) { alert(err.message); }
};

window.suspendUser = async function(id) {
  try {
    const res = await fetch(\`http://localhost:3000/api/users/\${id}/suspend\`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to suspend');
    if (!document.getElementById('adminTabDoctors').classList.contains('hidden')) renderDoctorsTable();
    if (!document.getElementById('adminTabResearchers').classList.contains('hidden')) renderResearchersTable();
  } catch(err) { alert(err.message); }
};

window.editUser = function() { alert('Edit User functionality coming soon!'); };
window.reportUser = function() { alert('User Report generation coming soon!'); };
`;

if (!js.includes('window.deleteUser')) {
  js += '\n' + actionsLogic;
}

const asyncRenderDoctors = `window.renderDoctorsTable = async function() {
  const tbody = document.getElementById('adDoctorsTable');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5">Loading from MongoDB...</td></tr>';
  
  try {
    const res = await fetch('http://localhost:3000/api/users');
    const users = await res.json();
    const doctors = users.filter(u => u.role === 'doctor');
    
    tbody.innerHTML = '';
    doctors.forEach(u => {
      const statusClass = (u.status || 'active') === 'active' ? 'status-active' : 'status-suspended';
      const tr = document.createElement('tr');
      tr.innerHTML = \`
        <td><strong>\${u.name}</strong></td>
        <td style="color:var(--text-secondary)">@\${u.username}</td>
        <td>\${u.specialty || '-'}</td>
        <td><span class="status-badge \${statusClass}">\${u.status || 'active'}</span></td>
        <td style="display:flex; gap:8px;">
          <button class="action-btn report-btn" onclick="reportUser()">📊 Report</button>
          <button class="action-btn edit-btn" onclick="editUser()">✏️ Edit</button>
          <button class="action-btn suspend-btn" onclick="suspendUser('\${u.id}')">\${(u.status || 'active') === 'suspended' ? '▶ Activate' : '⏸ Suspend'}</button>
          <button class="action-btn delete-btn" onclick="deleteUser('\${u.id}')">🗑 Delete</button>
        </td>\`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:red;">Error loading from MongoDB</td></tr>';
  }
}`;

const asyncRenderResearchers = `window.renderResearchersTable = async function() {
  const tbody = document.getElementById('adResearchersTable');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5">Loading from MongoDB...</td></tr>';
  
  try {
    const res = await fetch('http://localhost:3000/api/users');
    const users = await res.json();
    const researchers = users.filter(u => u.role === 'researcher');
    
    tbody.innerHTML = '';
    researchers.forEach(u => {
      const statusClass = (u.status || 'active') === 'active' ? 'status-active' : 'status-suspended';
      const tr = document.createElement('tr');
      tr.innerHTML = \`
        <td><strong>\${u.name}</strong></td>
        <td style="color:var(--text-secondary)">@\${u.username}</td>
        <td>\${u.specialty || '-'}</td>
        <td><span class="status-badge \${statusClass}">\${u.status || 'active'}</span></td>
        <td style="display:flex; gap:8px;">
          <button class="action-btn report-btn" onclick="reportUser()">📊 Report</button>
          <button class="action-btn edit-btn" onclick="editUser()">✏️ Edit</button>
          <button class="action-btn suspend-btn" onclick="suspendUser('\${u.id}')">\${(u.status || 'active') === 'suspended' ? '▶ Activate' : '⏸ Suspend'}</button>
          <button class="action-btn delete-btn" onclick="deleteUser('\${u.id}')">🗑 Delete</button>
        </td>\`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:red;">Error loading from MongoDB</td></tr>';
  }
}`;

js = js.replace(/window\.renderDoctorsTable = async function\(\) \{[\s\S]*?\}\n/m, asyncRenderDoctors + '\n');
js = js.replace(/window\.renderResearchersTable = async function\(\) \{[\s\S]*?\}\n/m, asyncRenderResearchers + '\n');

fs.writeFileSync('js/adminModule.js', js);
console.log('Patched frontend UI logic for action buttons.');
