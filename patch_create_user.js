const fs = require('fs');

// 1. Patch models/User.js
const newUserModel = `const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true }, // computed as firstName + lastName
  firstName: { type: String },
  lastName: { type: String },
  dob: { type: String },
  gender: { type: String },
  address: { type: String },
  role: { type: String, required: true, enum: ['admin', 'doctor', 'researcher'] },
  email: { type: String },
  mobile: { type: String },
  specialty: { type: String },
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
`;
fs.writeFileSync('models/User.js', newUserModel);


// 2. Patch index.html
let html = fs.readFileSync('index.html', 'utf8');

const oldForm = `<form id="adminCreateUserForm" onsubmit="handleCreateUser(event)">
                 
                 <div class="form-group" style="margin-bottom: 16px;">
                   <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">Account Role</label>
                   <select id="cuRole" style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary); appearance:none;">
                     <option value="doctor">Doctor</option>
                     <option value="researcher">Researcher</option>
                   </select>
                 </div>

                 <div style="display:flex; gap:16px; margin-bottom:24px;">
                   <div class="form-group" style="flex:1;">
                     <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">Username</label>
                     <input type="text" id="cuUsername" required placeholder="Enter username" style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary);" />
                   </div>
                   <div class="form-group" style="flex:1;">
                     <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">Password</label>
                     <input type="text" id="cuPassword" required placeholder="Set password" style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary);" />
                   </div>
                 </div>

                 <button type="submit" class="btn-primary" style="background: #6366f1; gap: 8px;">
                   <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                   Create User Account
                 </button>
               </form>`;

const newForm = `<form id="adminCreateUserForm" onsubmit="handleCreateUser(event)">
                 
                 <div style="display:flex; gap:16px; margin-bottom:16px;">
                   <div class="form-group" style="flex:1;">
                     <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">First Name</label>
                     <input type="text" id="cuFirstName" required placeholder="First name" style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary);" />
                   </div>
                   <div class="form-group" style="flex:1;">
                     <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">Last Name</label>
                     <input type="text" id="cuLastName" required placeholder="Last name" style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary);" />
                   </div>
                 </div>

                 <div style="display:flex; gap:16px; margin-bottom:16px;">
                   <div class="form-group" style="flex:1;">
                     <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">Date of Birth</label>
                     <input type="date" id="cuDOB" required style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary);" />
                   </div>
                   <div class="form-group" style="flex:1;">
                     <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">Gender</label>
                     <select id="cuGender" required style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary);">
                       <option value="" disabled selected>Select gender</option>
                       <option value="Male">Male</option>
                       <option value="Female">Female</option>
                       <option value="Other">Other</option>
                     </select>
                   </div>
                 </div>

                 <div style="display:flex; gap:16px; margin-bottom:16px;">
                   <div class="form-group" style="flex:1;">
                     <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">Mobile Number</label>
                     <input type="tel" id="cuMobile" required placeholder="Mobile number" style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary);" />
                   </div>
                   <div class="form-group" style="flex:1;">
                     <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">Email ID</label>
                     <input type="email" id="cuEmail" required placeholder="Email address" style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary);" />
                   </div>
                 </div>

                 <div class="form-group" style="margin-bottom: 16px;">
                   <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">Address</label>
                   <textarea id="cuAddress" required placeholder="Full residential address" rows="2" style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary); resize:vertical;"></textarea>
                 </div>

                 <div class="form-group" style="margin-bottom: 16px;">
                   <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">Account Role</label>
                   <select id="cuRole" style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary);">
                     <option value="doctor">Doctor</option>
                     <option value="researcher">Researcher</option>
                   </select>
                 </div>

                 <div style="display:flex; gap:16px; margin-bottom:24px;">
                   <div class="form-group" style="flex:1;">
                     <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">Username</label>
                     <input type="text" id="cuUsername" required placeholder="Enter username" style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary);" />
                   </div>
                   <div class="form-group" style="flex:1;">
                     <label style="display:block; margin-bottom:6px; font-size:12px; color:var(--text-secondary);">Password</label>
                     <input type="text" id="cuPassword" required placeholder="Set password" style="width:100%; padding:10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-primary);" />
                   </div>
                 </div>

                 <button type="submit" class="btn-primary" style="background: #6366f1; gap: 8px; width: 100%;">
                   <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                   Create User Account
                 </button>
               </form>`;

html = html.replace(oldForm, newForm);
fs.writeFileSync('index.html', html);


// 3. Patch js/adminModule.js
let js = fs.readFileSync('js/adminModule.js', 'utf8');

const oldHandleCreateUser = `window.handleCreateUser = async function(e) {
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
  };`;

const newHandleCreateUser = `window.handleCreateUser = async function(e) {
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
  };`;

js = js.replace(oldHandleCreateUser, newHandleCreateUser);
fs.writeFileSync('js/adminModule.js', js);

console.log('Successfully patched models, html, and js!');
