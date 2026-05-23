const fs = require('fs');
let adminJs = fs.readFileSync('js/adminModule.js', 'utf8');

const asyncCreateUser = `window.handleCreateUser = async function(e) {
  e.preventDefault();
  const role = document.getElementById('cuRole').value;
  const username = document.getElementById('cuUsername').value.trim();
  const password = document.getElementById('cuPassword').value.trim();

  // Since Name is required by the backend, we default it to the username
  const newUser = {
    id: 'usr_' + Date.now().toString(36),
    username, 
    password, 
    name: username, // Default to username since Name was removed from UI
    role, 
    email: '', 
    mobile: '', 
    specialty: ''
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

adminJs = adminJs.replace(/window\.handleCreateUser = async function\(e\) \{[\s\S]*?\n\};\n/m, asyncCreateUser + '\n');
fs.writeFileSync('js/adminModule.js', adminJs);
console.log('Patched handleCreateUser for simplified form');
