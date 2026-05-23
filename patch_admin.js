const fs = require('fs');
let code = fs.readFileSync('js/adminModule.js', 'utf8');

// Update onclick handlers
code = code.replace(/onclick="reportUser\(\)"/g, `onclick="reportUser('\${u.id}')"`);
code = code.replace(/onclick="editUser\(\)"/g, `onclick="editUser('\${u.id}')"`);

// Replace the placeholder functions
const placeholderEdit = "window.editUser = function() { alert('Edit User functionality coming soon!'); };";
const placeholderReport = "window.reportUser = function() { alert('User Report generation coming soon!'); };";

const newEditReport = `
window.reportUser = function(userId) {
  try {
    const patientsCount = DB.getPatientsByDoctor(userId).length;
    const scansCount = DB.getScansByDoctor(userId).length;
    
    // Create a beautiful custom modal using SweetAlert-like syntax but pure HTML/CSS
    const modalHtml = \`
      <div id="reportModal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;">
        <div style="background:#112236;border-radius:20px;padding:32px;max-width:400px;width:100%;box-shadow:0 20px 40px rgba(0,0,0,0.4);border:1px solid var(--border);">
          <h2 style="margin:0 0 16px;color:#fff;font-size:24px;">Doctor Report</h2>
          <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:12px;">
            <p style="margin:0 0 8px;color:var(--text-secondary);font-size:14px;">Total Patients Visited</p>
            <p style="margin:0;color:#fff;font-size:28px;font-weight:700;">\${patientsCount}</p>
          </div>
          <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:24px;">
            <p style="margin:0 0 8px;color:var(--text-secondary);font-size:14px;">Total Analyses Performed</p>
            <p style="margin:0;color:#fff;font-size:28px;font-weight:700;">\${scansCount}</p>
          </div>
          <button class="btn-primary btn-full" onclick="document.getElementById('reportModal').remove()">Close Report</button>
        </div>
      </div>
    \`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  } catch(e) {
    console.error(e);
    alert('Error generating report.');
  }
};

window.editUser = async function(userId) {
  const newName = prompt('Enter new Name (leave blank to skip):');
  const newSpecialty = prompt('Enter new Specialty (leave blank to skip):');
  const newPassword = prompt('Enter new Password (leave blank to skip):');

  if (!newName && !newSpecialty && !newPassword) {
    return;
  }

  const payload = {};
  if (newName) payload.name = newName;
  if (newSpecialty) payload.specialty = newSpecialty;
  if (newPassword) payload.password = newPassword;

  try {
    const res = await fetch(\`/api/users/\${userId}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast('User updated successfully', 'success');
      // Refresh both tables
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

code = code.replace(placeholderEdit, '');
code = code.replace(placeholderReport, newEditReport);

fs.writeFileSync('js/adminModule.js', code);
console.log('adminModule.js patched successfully!');
