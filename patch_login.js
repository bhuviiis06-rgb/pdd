const fs = require('fs');
let appJs = fs.readFileSync('js/app.js', 'utf8');

const newLogin = `window.handleLogin = async function() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword')?.value.trim() || '';
  
  if (!username) return alert('Enter username');
  if (!password) return alert('Enter password');

  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (!res.ok) {
      return alert('Invalid Username or Password');
    }
    
    const data = await res.json();
    const user = data.user;
    
    // AuthManager still used for session storage
    if (window.AuthManager) {
      AuthManager.login(user);
    }
    
    document.getElementById('loginPassword').value = '';
    routeUser(user);
    
  } catch (err) {
    alert('Cannot connect to login server.');
  }
};`;

appJs = appJs.replace(/function handleLogin\(\) \{[\s\S]*?\n\}\n/m, newLogin + '\n');
fs.writeFileSync('js/app.js', appJs);
console.log('Patched handleLogin in app.js');
