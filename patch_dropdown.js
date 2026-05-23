const fs = require('fs');

// 1. Inject CSS into index.html
let html = fs.readFileSync('index.html', 'utf8');
if (!html.includes('.user-dropdown-container')) {
  const cssBlock = `
  <style>
  /* User Profile Dropdown Styles */
  .user-dropdown-container {
    display: flex;
    align-items: center;
  }
  .user-avatar-toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 8px;
    transition: background 0.2s;
  }
  .user-avatar-toggle:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  .avatar-icon {
    width: 36px;
    height: 36px;
    background: #064e3b; /* dark teal */
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }
  .user-info-short {
    display: flex;
    flex-direction: column;
  }
  .user-info-short strong {
    font-size: 14px;
    color: #f1f5f9;
  }
  .user-info-short small {
    font-size: 11px;
    color: #94a3b8;
  }
  .user-dropdown-menu {
    position: absolute;
    top: 54px;
    right: 0;
    width: 240px;
    background: #1e293b; 
    border-radius: 16px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    z-index: 100;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding-bottom: 16px;
  }
  .user-dropdown-menu.hidden {
    display: none;
  }
  .dropdown-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 16px 16px 16px;
  }
  .avatar-lg {
    width: 56px;
    height: 56px;
    background: #0f766e;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    margin-bottom: 12px;
  }
  .dropdown-name {
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 4px;
  }
  .dropdown-email {
    font-size: 12px;
    color: #94a3b8;
  }
  .dropdown-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    margin: 0 16px 12px 16px;
  }
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    margin: 0 16px 8px 16px;
    color: #f8fafc;
    text-decoration: none;
    font-size: 13px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    transition: background 0.2s;
  }
  .dropdown-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .dropdown-logout-btn {
    background: #fb7185; 
    color: white;
    border: none;
    border-radius: 12px;
    padding: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin: 16px 16px 0 16px;
    transition: opacity 0.2s;
  }
  .dropdown-logout-btn:hover {
    opacity: 0.9;
  }
  </style>
  `;
  html = html.replace(/<\/head>/i, cssBlock + '\n</head>');
  fs.writeFileSync('index.html', html);
}

// 2. Update js/app.js
let js = fs.readFileSync('js/app.js', 'utf8');

const newRenderNavActions = `
window.toggleUserDropdown = function(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('userProfileDropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
};

window.addEventListener('click', function(e) {
  const dropdown = document.getElementById('userProfileDropdown');
  const toggle = document.querySelector('.user-avatar-toggle');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    if (!dropdown.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
      dropdown.classList.add('hidden');
    }
  }
});

function renderNavActions(user) {
  const container = document.getElementById('navActionsAuth');
  if (!container) return;
  
  if (!user) {
    container.innerHTML = \`<button class="nav-btn nav-btn-primary" onclick="showSection('sectionLogin')">Sign In</button>\`;
    return;
  }
  
  const roleDisplay = user.specialty || (user.role === 'admin' ? 'Platform Admin' : user.role === 'researcher' ? 'Research Scientist' : 'Dental Radiologist');
  const emailDisplay = user.email || \`\${user.username}@dentalai.com\`;
  
  container.innerHTML = \`
    <div class="user-dropdown-container" style="position: relative;">
      <div class="user-avatar-toggle" onclick="toggleUserDropdown(event)">
        <div class="avatar-icon">👨‍⚕️</div>
        <div class="user-info-short">
          <strong>\${user.name}</strong>
          <small>\${roleDisplay}</small>
        </div>
      </div>
      
      <div class="user-dropdown-menu hidden" id="userProfileDropdown">
        <div class="dropdown-header">
          <div class="avatar-lg">👨‍⚕️</div>
          <div class="dropdown-name">\${user.name}</div>
          <div class="dropdown-email">\${emailDisplay}</div>
        </div>
        <div class="dropdown-divider"></div>
        <a href="#" class="dropdown-item" onclick="event.preventDefault(); alert('Profile coming soon')">👤 My Profile</a>
        <a href="#" class="dropdown-item" onclick="event.preventDefault(); alert('Edit Profile coming soon')">✏️ Edit Profile</a>
        <a href="#" class="dropdown-item" onclick="event.preventDefault(); alert('Settings coming soon')">⚙️ Settings</a>
        <button class="dropdown-logout-btn" onclick="handleLogout()">Logout</button>
      </div>
    </div>
  \`;
}
`;

js = js.replace(/function renderNavActions\(user\) \{[\s\S]*?\}\n/m, newRenderNavActions + '\n');
fs.writeFileSync('js/app.js', js);
console.log('Successfully patched app.js and index.html');
