const fs = require('fs');

// 1. Patch index.html
let html = fs.readFileSync('index.html', 'utf8');

const profileModalHTML = `
  <!-- ====== MY PROFILE MODAL ====== -->
  <div class="modal hidden" id="modalMyProfile">
    <div class="modal-content" style="max-width: 500px; padding: 24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px; border-bottom: 1px solid var(--border); padding-bottom: 16px;">
        <h3 style="margin:0; font-size:20px; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
          <span>👤</span> My Profile
        </h3>
        <button class="btn-icon" onclick="closeMyProfileModal()">✕</button>
      </div>
      
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; align-items:center; gap:16px; margin-bottom: 8px;">
           <div style="width: 72px; height: 72px; background: #0f766e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px;">👨‍⚕️</div>
           <div>
             <div id="mpName" style="font-size: 20px; font-weight: 600; color: #fff;"></div>
             <div id="mpRole" style="font-size: 13px; color: var(--blue);"></div>
           </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div style="background:var(--bg-secondary); padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">Username</div>
            <div id="mpUsername" style="font-size:14px; color:var(--text-primary);"></div>
          </div>
          <div style="background:var(--bg-secondary); padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">Email ID</div>
            <div id="mpEmail" style="font-size:14px; color:var(--text-primary);"></div>
          </div>
          <div style="background:var(--bg-secondary); padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">Date of Birth</div>
            <div id="mpDOB" style="font-size:14px; color:var(--text-primary);"></div>
          </div>
          <div style="background:var(--bg-secondary); padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">Gender</div>
            <div id="mpGender" style="font-size:14px; color:var(--text-primary);"></div>
          </div>
          <div style="background:var(--bg-secondary); padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">Mobile Number</div>
            <div id="mpMobile" style="font-size:14px; color:var(--text-primary);"></div>
          </div>
          <div style="background:var(--bg-secondary); padding:12px; border-radius:8px;">
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">Account Status</div>
            <div id="mpStatus" style="font-size:14px; color:var(--teal);"></div>
          </div>
        </div>
        
        <div style="background:var(--bg-secondary); padding:12px; border-radius:8px;">
          <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">Address</div>
          <div id="mpAddress" style="font-size:14px; color:var(--text-primary); line-height:1.5;"></div>
        </div>
        
      </div>
      
      <div style="margin-top: 24px; text-align: right;">
        <button class="btn-primary" onclick="closeMyProfileModal()">Close</button>
      </div>
    </div>
  </div>
`;

if (!html.includes('id="modalMyProfile"')) {
  // Inject before the closing body tag
  html = html.replace('</body>', profileModalHTML + '\n</body>');
  fs.writeFileSync('index.html', html);
}

// 2. Patch js/app.js
let js = fs.readFileSync('js/app.js', 'utf8');

// Update renderNavActions
js = js.replace(/onclick="event\.preventDefault\(\); alert\('Profile coming soon'\)"/, 'onclick="event.preventDefault(); openMyProfileModal()"');

// Add open/close functions
const modalLogic = `
window.openMyProfileModal = function() {
  const user = AuthManager.getUser();
  if (!user) return;
  
  // Close dropdown if open
  const dropdown = document.getElementById('userProfileDropdown');
  if (dropdown) dropdown.classList.add('hidden');
  
  document.getElementById('mpName').textContent = user.name || (user.firstName ? user.firstName + ' ' + user.lastName : user.username);
  document.getElementById('mpRole').textContent = (user.specialty || user.role || '').toUpperCase();
  document.getElementById('mpUsername').textContent = user.username || 'N/A';
  document.getElementById('mpEmail').textContent = user.email || 'N/A';
  document.getElementById('mpDOB').textContent = user.dob || 'N/A';
  document.getElementById('mpGender').textContent = user.gender || 'N/A';
  document.getElementById('mpMobile').textContent = user.mobile || 'N/A';
  document.getElementById('mpStatus').textContent = (user.status || 'Active').toUpperCase();
  document.getElementById('mpAddress').textContent = user.address || 'N/A';
  
  document.getElementById('modalMyProfile').classList.remove('hidden');
};

window.closeMyProfileModal = function() {
  document.getElementById('modalMyProfile').classList.add('hidden');
};
`;

if (!js.includes('openMyProfileModal')) {
  js += '\n' + modalLogic;
}

fs.writeFileSync('js/app.js', js);
console.log('Successfully patched My Profile modal logic');
