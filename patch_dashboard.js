const fs = require('fs');

// 1. Patch index.html
let html = fs.readFileSync('index.html', 'utf8');

// Rename old dashboard to patientsList
html = html.replace('id="sectionDoctorDashboard"', 'id="sectionPatientsList"');
html = html.replace("onclick=\"showSection('upload')\"", "onclick=\"showSection('upload')\""); // No change needed here, just noting it

const newDashboardHTML = `
      <!-- ====== NEW MOBILE-FIRST DOCTOR DASHBOARD ====== -->
      <style>
      .dash-header { display: flex; align-items: center; gap: 16px; padding: 24px; background: #0b1a2a; border-radius: 0 0 40px 0; position: relative; overflow: hidden; }
      .dash-header::before { content: ""; position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: rgba(14, 42, 71, 0.5); border-radius: 50%; }
      .dash-avatar { width: 64px; height: 64px; background: #113247; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; z-index: 1; }
      .dash-user-info { z-index: 1; }
      .dash-user-info h2 { margin: 0; font-size: 24px; color: #fff; font-weight: 700; }
      .dash-user-info p { margin: 4px 0 0; font-size: 14px; color: #94a3b8; }
      .dash-welcome-card { margin: -20px 24px 24px; background: #112236; padding: 24px; border-radius: 20px; position: relative; z-index: 2; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
      .dash-welcome-card h3 { margin: 0; font-size: 20px; color: #fff; display:flex; align-items:center; gap:8px; }
      .dash-welcome-card p { margin: 8px 0 0; font-size: 13px; color: #94a3b8; }
      .dash-stats-row { display: flex; gap: 16px; margin: 0 24px 24px; }
      .dash-stat-card { flex: 1; background: #112236; padding: 20px; border-radius: 20px; }
      .dash-stat-card p { margin: 0 0 8px; font-size: 13px; color: #94a3b8; }
      .dash-stat-card h3 { margin: 0; font-size: 32px; color: #fff; font-weight: 700; }
      .dash-section-title { margin: 0 24px 16px; font-size: 18px; color: #fff; font-weight: 700; }
      .dash-actions-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 0 24px 24px; }
      .dash-action-btn { background: #112236; border: none; border-radius: 20px; padding: 20px 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; }
      .dash-action-btn:hover { background: #1a365d; }
      .dash-action-icon { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; }
      .icon-blue { background: rgba(37, 99, 235, 0.2); color: #3b82f6; }
      .icon-teal { background: rgba(20, 184, 166, 0.2); color: #14b8a6; }
      .icon-pink { background: rgba(236, 72, 153, 0.2); color: #ec4899; }
      .dash-recent-list { margin: 0 24px 24px; }
      .dash-recent-item { background: #112236; padding: 16px 20px; border-radius: 16px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;}
      .dash-recent-item h4 { margin: 0; font-size: 14px; color: #fff; }
      .dash-recent-item p { margin: 0; font-size: 12px; color: #94a3b8; }
      </style>

      <section class="section hidden" id="sectionDoctorDashboard" style="padding: 0; background: #040d17; min-height: 100vh;">
        <div class="dash-header">
          <div class="dash-avatar">👨‍⚕️</div>
          <div class="dash-user-info">
            <h2 id="dashUserName">Loading...</h2>
            <p id="dashUserRole">Loading...</p>
          </div>
        </div>

        <div class="dash-welcome-card">
          <h3>Welcome Back 👋</h3>
          <p>Monitor patient DMFT trends</p>
        </div>

        <div class="dash-stats-row">
          <div class="dash-stat-card">
            <p>Patients</p>
            <h3 id="dashStatPatients">0</h3>
          </div>
          <div class="dash-stat-card">
            <p>AI Reports</p>
            <h3 id="dashStatReports">0</h3>
          </div>
        </div>

        <h3 class="dash-section-title">Quick Actions</h3>
        <div class="dash-actions-grid">
          <button class="dash-action-btn" onclick="showSection('upload')">
            <div class="dash-action-icon icon-blue">➕</div>
            Add Patient
          </button>
          <button class="dash-action-btn" onclick="showSection('patientsList')">
            <div class="dash-action-icon icon-teal">👥</div>
            Patients
          </button>
          <button class="dash-action-btn" onclick="showSection('upload')">
            <div class="dash-action-icon icon-pink">🧠</div>
            AI Analysis
          </button>
        </div>

        <h3 class="dash-section-title">Recent Activity</h3>
        <div class="dash-recent-list" id="dashRecentActivity">
          <div class="dash-recent-item">
            <h4>No recent activity</h4>
            <p>Start a new analysis to see it here.</p>
          </div>
        </div>
      </section>
`;

if (!html.includes('id="dashUserName"')) {
  // Inject right after <div id="moduleDoctor" class="hidden">
  html = html.replace('<div id="moduleDoctor" class="hidden">', '<div id="moduleDoctor" class="hidden">\n' + newDashboardHTML);
  fs.writeFileSync('index.html', html);
}

// 2. Patch js/app.js
let appJS = fs.readFileSync('js/app.js', 'utf8');

// Update routing array to include sectionPatientsList
appJS = appJS.replace("['sectionLogin', 'sectionUpload', 'sectionProcessing', 'sectionResults', 'sectionDoctorDashboard'].forEach", "['sectionLogin', 'sectionUpload', 'sectionProcessing', 'sectionResults', 'sectionDoctorDashboard', 'sectionPatientsList'].forEach");

fs.writeFileSync('js/app.js', appJS);


// 3. Patch js/doctorModule.js
let doctorJS = fs.readFileSync('js/doctorModule.js', 'utf8');

const oldShowDoctorDashboard = `window.showDoctorDashboard = function() {
  showSection('sectionDoctorDashboard');
  renderPatients();
};`;

const newShowDoctorDashboard = `window.showDoctorDashboard = function() {
  showSection('sectionDoctorDashboard');
  
  const user = AuthManager.getUser();
  if (user) {
    document.getElementById('dashUserName').textContent = user.name || (user.firstName ? user.firstName + ' ' + user.lastName : user.username);
    document.getElementById('dashUserRole').textContent = user.specialty || (user.role === 'doctor' ? 'Dental Radiologist' : 'Specialist');
  }

  const patients = DB.getPatients();
  document.getElementById('dashStatPatients').textContent = patients.length;
  
  // Total reports = all scans across all patients
  const totalReports = patients.reduce((acc, p) => acc + p.scans.length, 0);
  document.getElementById('dashStatReports').textContent = totalReports;

  // Render recent activity
  const recentContainer = document.getElementById('dashRecentActivity');
  const allScans = [];
  patients.forEach(p => {
    p.scans.forEach(s => allScans.push({ patientName: p.name, ...s }));
  });
  
  // Sort by date desc
  allScans.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (allScans.length > 0) {
    recentContainer.innerHTML = '';
    // Show top 3
    allScans.slice(0, 3).forEach(scan => {
      const date = new Date(scan.date);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHrs / 24);
      
      let timeStr = '';
      if (diffMins < 60) timeStr = \`\${diffMins} mins ago\`;
      else if (diffHrs < 24) timeStr = \`\${diffHrs} hours ago\`;
      else timeStr = \`\${diffDays} days ago\`;

      const item = document.createElement('div');
      item.className = 'dash-recent-item';
      item.innerHTML = \`
        <h4>AI analyzed \${scan.patientName}'s \${scan.type.toUpperCase()}</h4>
        <p>\${timeStr}</p>
      \`;
      recentContainer.appendChild(item);
    });
  } else {
    recentContainer.innerHTML = \`<div class="dash-recent-item"><h4>No recent activity</h4><p>Start a new analysis to see it here.</p></div>\`;
  }
};`;

if (doctorJS.includes(oldShowDoctorDashboard)) {
  doctorJS = doctorJS.replace(oldShowDoctorDashboard, newShowDoctorDashboard);
} else if (!doctorJS.includes('dashStatPatients')) {
  // Fallback if formatting changed
  doctorJS = doctorJS.replace(/window\.showDoctorDashboard\s*=\s*function\(\)\s*{[\s\S]*?};/, newShowDoctorDashboard);
}

fs.writeFileSync('js/doctorModule.js', doctorJS);

console.log('Successfully patched Doctor Dashboard redesign!');
