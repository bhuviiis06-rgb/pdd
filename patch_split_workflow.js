const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Dashboard buttons
html = html.replace(
  `onclick="showSection('sectionUpload')">\n            <div class="dash-action-icon icon-blue">➕</div>\n            Add Patient`,
  `onclick="showSection('sectionAddPatient')">\n            <div class="dash-action-icon icon-blue">➕</div>\n            Add Patient`
);

html = html.replace(
  `onclick="showSection('sectionUpload')">New Analysis</button>`,
  `onclick="showSection('sectionUpload'); populatePatientDropdown();">New Analysis</button>`
);

html = html.replace(
  `onclick="showSection('sectionUpload')">\n            <div class="dash-action-icon icon-pink">🧠</div>\n            AI Analysis`,
  `onclick="showSection('sectionUpload'); populatePatientDropdown();">\n            <div class="dash-action-icon icon-pink">🧠</div>\n            AI Analysis`
);

const uploadSectionStart = html.indexOf('<!-- Upload / New Analysis -->');
const processingSectionStart = html.indexOf('<!-- Processing Section -->');
const oldUploadHtml = html.substring(uploadSectionStart, processingSectionStart);

const newUploadHtml = `<!-- Add Patient Section -->
      <section class="section hidden" id="sectionAddPatient">
        <div class="section-header">
          <button class="back-btn" onclick="showDoctorDashboard()">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
            Dashboard
          </button>
          <div>
            <h2 class="section-title">Add New Patient</h2>
            <p class="section-subtitle">Register patient demographics before uploading radiographs</p>
          </div>
        </div>

        <div class="upload-layout" style="display: block; max-width: 600px; margin: 0 auto;">
          <div class="card patient-form-card">
            <div class="card-header">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>
              Patient Demographics
            </div>
            <div class="card-body">
              <div class="form-row">
                <div class="form-group">
                  <label for="patientName">Full Name *</label>
                  <input type="text" id="patientName" placeholder="e.g. John Smith" />
                </div>
                <div class="form-group">
                  <label for="patientAge">Age *</label>
                  <input type="number" id="patientAge" placeholder="e.g. 32" min="1" max="120" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="patientGender">Gender</label>
                  <select id="patientGender">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="patientId">Patient ID</label>
                  <input type="text" id="patientId" placeholder="Auto-generated" readonly />
                </div>
              </div>
              <div class="form-group">
                <label for="clinicalNotes">Clinical Notes (optional)</label>
                <textarea id="clinicalNotes" placeholder="Chief complaint, relevant history..." rows="2"></textarea>
              </div>
              <button class="btn-primary btn-full" onclick="savePatient()">Save Patient Data</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Upload / AI Analysis -->
      <section class="section upload-section hidden" id="sectionUpload">
        <div class="section-header">
          <button class="back-btn" onclick="showDoctorDashboard()">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
            Dashboard
          </button>
          <div>
            <h2 class="section-title">Clinical Diagnostic Workflow</h2>
            <p class="section-subtitle">Select a patient and upload an OPG radiograph for AI analysis</p>
          </div>
        </div>

        <div class="upload-layout">
          <!-- Select Patient Card -->
          <div class="card patient-form-card">
            <div class="card-header">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>
              Select Patient
            </div>
            <div class="card-body">
              <div class="form-group">
                <label for="aiPatientSelect" style="color: #8baed4; font-size: 14px;">Choose Existing Patient *</label>
                <select id="aiPatientSelect" onchange="checkUploadStatus()" style="padding: 12px; font-size: 15px;">
                  <option value="">Loading patients...</option>
                </select>
                <p style="font-size: 13px; color: #94a3b8; margin-top: 12px;">Don't see the patient? <a href="#" style="color: #60a5fa;" onclick="showSection('sectionAddPatient')">Add a new patient</a> first.</p>
              </div>
            </div>
          </div>

          <!-- Upload Area -->
          <div class="card upload-card">
            <div class="card-header">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/></svg>
              OPG Radiograph Upload
            </div>
            <div class="card-body">
              <div class="drop-zone" id="dropZone">
                <input type="file" id="fileInput" accept="image/*,.dcm" hidden />
                <div class="dz-inner" id="dzInner">
                  <div class="dz-icon">
                    <svg viewBox="0 0 64 64" fill="none"><rect x="8" y="16" width="48" height="36" rx="4" stroke="currentColor" stroke-width="2"/><path d="M8 44l14-12 10 10 8-8 14 10" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="22" cy="28" r="4" stroke="currentColor" stroke-width="2"/><path d="M32 4v12M28 8l4-4 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                  </div>
                  <p class="dz-title">Drop OPG radiograph here</p>
                  <p class="dz-subtitle">or <span class="dz-link" onclick="document.getElementById('fileInput').click()">browse to upload</span></p>
                </div>
                <div class="dz-preview hidden" id="dzPreview">
                  <img id="previewImg" alt="OPG Preview" />
                  <button class="dz-remove" id="removeImgBtn" onclick="removeImage()">✕</button>
                </div>
              </div>
              <div class="analysis-options">
                <div class="option-title">AI Processing Modules</div>
                <div class="options-grid">
                  <label class="option-check">
                    <input type="checkbox" id="modCaries" checked>
                    <div class="check-box"></div>
                    Caries Detection
                  </label>
                  <label class="option-check">
                    <input type="checkbox" id="modBone" checked>
                    <div class="check-box"></div>
                    Bone Loss Analysis
                  </label>
                  <label class="option-check">
                    <input type="checkbox" id="modRoots" checked>
                    <div class="check-box"></div>
                    Root Pathology
                  </label>
                  <label class="option-check">
                    <input type="checkbox" id="modRestorations" checked>
                    <div class="check-box"></div>
                    Existing Restorations
                  </label>
                </div>
              </div>
              <button class="btn-primary btn-full" id="analyzeBtn" onclick="startAnalysis()" disabled>Start AI Analysis</button>
            </div>
          </div>
        </div>
      </section>
`;

html = html.replace(oldUploadHtml, newUploadHtml);
fs.writeFileSync('index.html', html);

let js = fs.readFileSync('js/app.js', 'utf8');
js = js.replace(
  "['sectionLogin', 'sectionUpload',",
  "['sectionLogin', 'sectionAddPatient', 'sectionUpload',"
);

const jsAppend = "\nwindow.savePatient = function() {\n  const name = $('patientName').value.trim();\n  const age = parseInt($('patientAge').value);\n  const gender = $('patientGender').value;\n  const notes = $('clinicalNotes').value.trim();\n  \n  if(!name || isNaN(age)) {\n    showToast('Please provide Patient Name and Age.', 'error');\n    return;\n  }\n  \n  const user = AuthManager.getUser();\n  const patientData = { name, age, gender, notes, doctorId: user.id };\n  let patient = DB.savePatient(patientData);\n  \n  showToast('Patient created successfully!', 'success');\n  \n  $('patientName').value = '';\n  $('patientAge').value = '';\n  $('patientGender').value = '';\n  $('clinicalNotes').value = '';\n  \n  showSection('sectionPatientsList');\n  renderPatientsList();\n};\n\nwindow.populatePatientDropdown = function() {\n  const user = AuthManager.getUser();\n  if(!user) return;\n  const patients = DB.getPatientsByDoctor(user.id) || [];\n  const select = $('aiPatientSelect');\n  if(!select) return;\n  \n  select.innerHTML = '<option value=\"\">Select a patient...</option>';\n  patients.forEach(p => {\n    const opt = document.createElement('option');\n    opt.value = p.id;\n    opt.textContent = p.name + ' (' + p.id + ')';\n    select.appendChild(opt);\n  });\n};\n\nwindow.checkUploadStatus = function() {\n  const patientId = $('aiPatientSelect') ? $('aiPatientSelect').value : null;\n  const hasImage = !$('dzPreview').classList.contains('hidden');\n  if (patientId && hasImage) {\n    $('analyzeBtn').removeAttribute('disabled');\n  } else {\n    $('analyzeBtn').setAttribute('disabled', 'true');\n  }\n};\n\nwindow.handleFile = function(file) {\n  if(!file) return;\n  if(file.type.startsWith('image/')) {\n    const reader = new FileReader();\n    reader.onload = e => {\n      $('previewImg').src = e.target.result;\n      $('dzInner').classList.add('hidden');\n      $('dzPreview').classList.remove('hidden');\n      checkUploadStatus();\n    };\n    reader.readAsDataURL(file);\n  } else if(file.name.endsWith('.dcm')) {\n    $('previewImg').src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Orthopantomogram.jpg/800px-Orthopantomogram.jpg';\n    $('dzInner').classList.add('hidden');\n    $('dzPreview').classList.remove('hidden');\n    checkUploadStatus();\n  }\n};\n\nwindow.removeImage = function(e) {\n  if(e) e.stopPropagation();\n  $('fileInput').value = '';\n  $('previewImg').src = '';\n  $('dzPreview').classList.add('hidden');\n  $('dzInner').classList.remove('hidden');\n  checkUploadStatus();\n};\n\nwindow.startAnalysis = async function() {\n  const patientId = $('aiPatientSelect').value;\n  if(!patientId) {\n    showToast('Please select a patient.', 'error');\n    return;\n  }\n  \n  const user = AuthManager.getUser();\n  let patient = DB.getPatient(patientId);\n  \n  showSection('sectionProcessing');\n  const steps = [\n    {id:'step1', time:800},\n    {id:'step2', time:1200},\n    {id:'step3', time:1500},\n    {id:'step4', time:800},\n    {id:'step5', time:500}\n  ];\n  \n  let totalTime = steps.reduce((a,c)=>a+c.time,0);\n  let passedTime = 0;\n  \n  steps.forEach(s => {\n    $(s.id).className = 'ps-item';\n    $(s.id).querySelector('.ps-icon').className = 'ps-icon pending';\n    let status = $(s.id).querySelector('.ps-status');\n    if(status) status.remove();\n  });\n  $('progressBar').style.width = '0%';\n  \n  for(let i=0; i<steps.length; i++) {\n    let s = steps[i];\n    $(s.id).classList.add('active');\n    $(s.id).querySelector('.ps-icon').className = 'ps-icon active';\n    \n    await new Promise(r => setTimeout(r, s.time));\n    \n    $(s.id).classList.remove('active');\n    $(s.id).classList.add('done');\n    $(s.id).querySelector('.ps-icon').className = 'ps-icon done';\n    $(s.id).querySelector('.ps-icon').innerHTML = '✓';\n    \n    let status = document.createElement('div');\n    status.className = 'ps-status';\n    status.textContent = 'Completed';\n    $(s.id).querySelector('.ps-text').appendChild(status);\n    \n    passedTime += s.time;\n    $('progressBar').style.width = (passedTime / totalTime * 100) + '%';\n  }\n  \n  const mockReport = {\n    dmft: Math.floor(Math.random()*8)+2,\n    D: Math.floor(Math.random()*4),\n    M: Math.floor(Math.random()*3),\n    F: Math.floor(Math.random()*5),\n    notes: \"AI mock analysis completed.\"\n  };\n  \n  const scanData = {\n    patientId: patient.id,\n    report: mockReport,\n    imageUrl: $('previewImg').src\n  };\n  \n  DB.saveScan(scanData, user.id);\n  \n  renderResults(patient, scanData);\n  showSection('sectionResults');\n};\n";

if (!js.includes('window.savePatient = function()')) {
  fs.appendFileSync('js/app.js', jsAppend);
}
