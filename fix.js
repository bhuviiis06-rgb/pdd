const fs = require('fs');

const logic = `
window.openEditProfileModal = function() {
  const user = AuthManager.getUser();
  if (!user) return;
  
  const dropdown = document.getElementById('userProfileDropdown');
  if (dropdown) dropdown.classList.add('hidden');
  
  document.getElementById('epNewPassword').value = '';
  
  if (user.passwordChanged) {
    document.getElementById('epContainer').classList.add('hidden');
    document.getElementById('epLockedContainer').classList.remove('hidden');
  } else {
    document.getElementById('epContainer').classList.remove('hidden');
    document.getElementById('epLockedContainer').classList.add('hidden');
  }
  
  document.getElementById('modalEditProfile').classList.remove('hidden');
};

window.closeEditProfileModal = function() {
  document.getElementById('modalEditProfile').classList.add('hidden');
};

window.submitPasswordChange = async function() {
  const user = AuthManager.getUser();
  if (!user) return;
  const newPass = document.getElementById('epNewPassword').value.trim();
  if (!newPass) return alert('Please enter a new password');
  
  try {
    const res = await fetch('http://localhost:3000/api/users/' + user.id + '/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: newPass })
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    
    const updatedUser = await res.json();
    sessionStorage.setItem('dentai_current_user', JSON.stringify(updatedUser));
    
    showToast('Password successfully changed!', 'success');
    closeEditProfileModal();
    
  } catch (err) {
    alert('Failed to change password: ' + err.message);
  }
};
`;

let js = fs.readFileSync('js/app.js', 'utf8');
if (!js.includes('submitPasswordChange')) {
  fs.appendFileSync('js/app.js', '\n' + logic);
  console.log("Fixed!");
} else {
  console.log("Already applied!");
}
