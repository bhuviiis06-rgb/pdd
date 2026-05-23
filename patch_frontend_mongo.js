const fs = require('fs');

let adminJs = fs.readFileSync('js/adminModule.js', 'utf8');

// Update handleCreateUser to be async and use fetch
const asyncCreateUser = `window.handleCreateUser = async function(e) {
  e.preventDefault();
  const name = document.getElementById('cuFullName').value.trim();
  const username = document.getElementById('cuUsername').value.trim();
  const password = document.getElementById('cuPassword').value.trim();
  const email = document.getElementById('cuEmail').value.trim();
  const mobile = document.getElementById('cuMobile').value.trim();
  const role = document.getElementById('cuRole').value;
  const specialty = document.getElementById('cuSpecialty').value.trim();

  const newUser = {
    id: 'usr_' + Date.now().toString(36),
    username, password, name, role, email, mobile, specialty
  };

  try {
    const res = await fetch('http://localhost:3000/api/users', {
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
};`;

adminJs = adminJs.replace(/window\.handleCreateUser = function\(e\) \{[\s\S]*?\n\};\n/m, asyncCreateUser + '\n');

// Update renderDoctorsTable
const asyncRenderDoctors = `window.renderDoctorsTable = async function() {
  const tbody = document.getElementById('adDoctorsTable');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4">Loading from MongoDB...</td></tr>';
  
  try {
    const res = await fetch('http://localhost:3000/api/users');
    const users = await res.json();
    const doctors = users.filter(u => u.role === 'doctor');
    
    tbody.innerHTML = '';
    doctors.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = \`<td>\${u.name}</td><td>\${u.username}</td><td>\${u.specialty || '-'}</td><td>\${u.email || '-'}</td>\`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:red;">Error loading from MongoDB</td></tr>';
  }
}`;

adminJs = adminJs.replace(/function renderDoctorsTable\(\) \{[\s\S]*?\n\}\n/m, asyncRenderDoctors + '\n');

// Update renderResearchersTable
const asyncRenderResearchers = `window.renderResearchersTable = async function() {
  const tbody = document.getElementById('adResearchersTable');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4">Loading from MongoDB...</td></tr>';
  
  try {
    const res = await fetch('http://localhost:3000/api/users');
    const users = await res.json();
    const researchers = users.filter(u => u.role === 'researcher');
    
    tbody.innerHTML = '';
    researchers.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = \`<td>\${u.name}</td><td>\${u.username}</td><td>\${u.specialty || '-'}</td><td>\${u.email || '-'}</td>\`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:red;">Error loading from MongoDB</td></tr>';
  }
}`;

adminJs = adminJs.replace(/function renderResearchersTable\(\) \{[\s\S]*?\n\}\n/m, asyncRenderResearchers + '\n');

fs.writeFileSync('js/adminModule.js', adminJs);
console.log('Patched frontend to use MongoDB fetch calls');
