const fs = require('fs');

let js = fs.readFileSync('js/app.js', 'utf8');

const mockStart = js.indexOf('window.handleFile = function(file) {');
if (mockStart !== -1) {
  js = js.substring(0, mockStart);
}

js = js.replace(
  "    $('analyzeBtn').disabled = false;",
  "    checkUploadStatus();"
);

js = js.replace(
  "    $('analyzeBtn').disabled = true;",
  "    checkUploadStatus();"
);

const origStartAnalysis = `window.startAnalysis = async function() {
  const name = $('patientName').value.trim();
  const age  = $('patientAge').value.trim();
  if (!name || !age) { showToast('Please enter patient name and age.', 'error'); return; }
  if (!AppState.currentFile) { showToast('Please upload an OPG image.', 'error'); return; }

  const doctor = AuthManager.getUser();

  AppState.currentPatient = {
    id:     $('patientId').value,
    name,
    age:    parseInt(age),
    gender: $('patientGender').value || 'Not specified',
    notes:  $('clinicalNotes').value.trim(),
  };
  
  // Save Patient to DB
  DB.savePatient(AppState.currentPatient, doctor.id);

  AppState.processingStart = Date.now();
  showSection('sectionProcessing');
  await runPipeline(doctor);
}`;

const newStartAnalysis = `window.startAnalysis = async function() {
  const patientId = $('aiPatientSelect') ? $('aiPatientSelect').value : null;
  if (!patientId) { showToast('Please select a patient.', 'error'); return; }
  if (!AppState.currentFile) { showToast('Please upload an OPG image.', 'error'); return; }

  const doctor = AuthManager.getUser();
  AppState.currentPatient = DB.getPatient(patientId);

  AppState.processingStart = Date.now();
  showSection('sectionProcessing');
  await runPipeline(doctor);
}`;

js = js.replace(origStartAnalysis, newStartAnalysis);

fs.writeFileSync('js/app.js', js);
