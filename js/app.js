/**
 * DentAI – Main Application Controller (Platform Edition)
 * Orchestrates Authentication, Routing, and the Doctor Analysis Pipeline
 */

// ─── State ─────────────────────────────────────────────────────────────────
const AppState = {
  currentFile:    null,
  currentImage:   null,       
  originalCanvas: null,       
  enhancedCanvas: null,       
  currentTeeth:   null,       
  currentReport:  null,       
  currentPatient: null,       
  processingStart: 0,
};

const $ = id => document.getElementById(id);

// ─── Initialisation ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initDropZone();
  
  // Auth Check
  if (AuthManager.isLoggedIn()) {
    routeUser(AuthManager.getUser());
  } else {
    showSection('sectionLanding');
    renderNavActions();
  }
});

// ─── Particles Background ───────────────────────────────────────────────────
function initParticles() {
  const container = $('bgParticles');
  const sizes = [180, 240, 140, 300, 200, 160, 280];
  sizes.forEach((size, i) => {
    const el = document.createElement('div');
    el.className = 'particle';
    el.style.cssText = `width:${size}px; height:${size}px; left:${Math.random()*90}%; top:${Math.random()*90}%; --dur:${14+i*3}s; --delay:-${i*2.5}s;`;
    container.appendChild(el);
  });
}

// ─── Authentication & Routing ───────────────────────────────────────────────
window.handleLogin = async function() {
  const username = $('loginUsername').value.trim().toLowerCase();
  const password = $('loginPassword').value.trim();
  try {
    const user = await AuthManager.login(username, password);
    routeUser(user);
    showToast(`Welcome back, ${user.name}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.handleLogout = function() {
  if (!confirm('Are you sure you want to log out?')) return;
  AuthManager.logout();
  hideAllModules();
  showSection('sectionLanding');
  renderNavActions();
};

function routeUser(user) {
  hideAllModules();
  renderNavActions(user);
  
  if (user.role === 'doctor') {
    $('moduleDoctor').classList.remove('hidden');
    $('navRoleTagline').textContent = 'Clinical Diagnostic Workspace';
    showDoctorDashboard();
  } else if (user.role === 'researcher') {
    $('moduleResearcher').classList.remove('hidden');
    $('navRoleTagline').textContent = 'Epidemiological Research Workspace';
    showSection('sectionResearcherDashboard');
    ResearcherModule.renderDashboard();
  } else if (user.role === 'admin') {
    $('moduleAdmin').classList.remove('hidden');
    $('navRoleTagline').textContent = 'Platform Administration';
    showSection('sectionAdminDashboard');
    AdminModule.renderDashboard();
  }
}

function hideAllModules() {
  $('moduleDoctor').classList.add('hidden');
  $('moduleResearcher').classList.add('hidden');
  $('moduleAdmin').classList.add('hidden');
  ['sectionLogin', 'sectionAddPatient', 'sectionUpload', 'sectionProcessing', 'sectionResults', 'sectionDoctorDashboard', 'sectionPatientsList'].forEach(id => {
    const el = $(id);
    if(el) el.classList.add('hidden');
  });
}


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
    container.innerHTML = `<button class="nav-btn nav-btn-primary" onclick="showSection('sectionLogin')">Sign In</button>`;
    return;
  }
  
  const roleDisplay = user.specialty || (user.role === 'admin' ? 'Platform Admin' : user.role === 'researcher' ? 'Research Scientist' : 'Dental Radiologist');
  const emailDisplay = user.email || `${user.username}@dentalai.com`;
  
  container.innerHTML = `
    <div class="user-dropdown-container" style="position: relative;">
      <div class="user-avatar-toggle" onclick="toggleUserDropdown(event)">
        <div class="avatar-icon">👨‍⚕️</div>
        <div class="user-info-short">
          <strong>${user.name}</strong>
          <small>${roleDisplay}</small>
        </div>
      </div>
      
      <div class="user-dropdown-menu hidden" id="userProfileDropdown">
        <div class="dropdown-header">
          <div class="avatar-lg">👨‍⚕️</div>
          <div class="dropdown-name">${user.name}</div>
          <div class="dropdown-email">${emailDisplay}</div>
        </div>
        <div class="dropdown-divider"></div>
        <a href="#" class="dropdown-item" onclick="event.preventDefault(); openMyProfileModal()">👤 My Profile</a>
        <a href="#" class="dropdown-item" onclick="event.preventDefault(); openEditProfileModal()">✏️ Edit Profile</a>
        <button class="dropdown-logout-btn" onclick="handleLogout()">Logout</button>
      </div>
    </div>
  `;
}


function showSection(id) {
  // Hide all sections first
  document.querySelectorAll('.section').forEach(el => {
    el.classList.add('hidden');
  });

  if (id === 'upload' || id === 'sectionUpload') {
    generatePatientId();
    const pName = $('patientName'); if(pName) pName.value = '';
    const pAge = $('patientAge'); if(pAge) pAge.value = '';
    const pGen = $('patientGender'); if(pGen) pGen.value = '';
    const pNotes = $('clinicalNotes'); if(pNotes) pNotes.value = '';
    if (typeof removeImage === 'function') removeImage();
    id = 'sectionUpload';
  }

  const target = $(id);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('animate-in');
    setTimeout(() => target.classList.remove('animate-in'), 500);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ─── DOCTOR MODULE LOGIC ────────────────────────────────────────────────────

window.showDoctorDashboard = function() {
  const user = AuthManager.getUser();
  if (!user || user.role !== 'doctor') return;
  showSection('sectionDoctorDashboard');
  
  document.getElementById('dashUserName').textContent = user.name || (user.firstName ? user.firstName + ' ' + user.lastName : user.username);
  document.getElementById('dashUserRole').textContent = user.specialty || 'Dental Radiologist';

  const patients = DB.getPatientsByDoctor((user.id || user._id)) || [];
  document.getElementById('dashStatPatients').textContent = patients.length;
  
  const allScans = [];
  patients.forEach(p => {
    const scans = DB.getScansByPatient(p.id) || [];
    scans.forEach(s => allScans.push({ patientName: p.name, ...s }));
  });
  
  const totalReports = allScans.length;
  document.getElementById('dashStatReports').textContent = totalReports;

  const recentContainer = document.getElementById('dashRecentActivity');
  allScans.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
  
  if (allScans.length > 0) {
    recentContainer.innerHTML = '';
    allScans.slice(0, 3).forEach(scan => {
      const scanDate = new Date(scan.timestamp || scan.date || new Date());
      const diffMins = Math.floor((new Date() - scanDate) / 60000);
      const timeStr = diffMins < 60 ? `${diffMins} mins ago` : (diffMins < 1440 ? `${Math.floor(diffMins/60)} hours ago` : `${Math.floor(diffMins/1440)} days ago`);
      const item = document.createElement('div');
      item.className = 'dash-recent-item';
      item.innerHTML = `<h4>AI analyzed ${scan.patientName}'s OPG</h4><p>${timeStr}</p>`;
      recentContainer.appendChild(item);
    });
  } else {
    recentContainer.innerHTML = '<div class="dash-recent-item"><h4>No recent activity</h4><p>Start a new analysis to see it here.</p></div>';
  }
};

function generatePatientId() {
  $('patientId').value = DB.generateId('PT');
}

function initDropZone() {
  const dz = $('dropZone');
  const input = $('fileInput');
  if(!dz || !input) return;

  dz.addEventListener('click', e => { if (!e.target.closest('.dz-remove')) input.click(); });
  input.addEventListener('change', () => { if (input.files[0]) handleFile(input.files[0]); });
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
}

function handleFile(file) {
  const allowed = ['image/jpeg','image/png','image/tiff','image/bmp','image/webp','image/gif','application/dicom'];
  if (!allowed.includes(file.type) && !file.name.endsWith('.dcm')) {
    showToast('Unsupported file type.', 'error'); return;
  }
  AppState.currentFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    $('previewImg').src = e.target.result;
    $('dzInner').classList.add('hidden');
    $('dzPreview').classList.remove('hidden');
    checkUploadStatus();
  };
  reader.readAsDataURL(file);
}

window.removeImage = function() {
  AppState.currentFile = null;
  $('fileInput').value = '';
  $('previewImg').src  = '';
  $('dzInner').classList.remove('hidden');
  $('dzPreview').classList.add('hidden');
  $('analyzeBtn').disabled = true;
};

// ─── Analysis Pipeline ──────────────────────────────────────────────────────
window.startAnalysis = async function() {
  const patientId = $('aiPatientSelect') ? $('aiPatientSelect').value : null;
  if (!patientId) { showToast('Please select a patient.', 'error'); return; }
  if (!AppState.currentFile) { showToast('Please upload an OPG image.', 'error'); return; }

  const doctor = AuthManager.getUser();
  AppState.currentPatient = DB.getPatient(patientId);

  AppState.processingStart = Date.now();
  showSection('sectionProcessing');
  await runPipeline(doctor);
}

async function runPipeline(doctor) {
  try {
    // 1. Preprocessing
    await activateStep(1, 'Enhancing image contrast and reducing noise...');
    const preprocessResult = await ImageProcessor.preprocess(AppState.currentFile);
    AppState.enhancedCanvas = preprocessResult.enhancedCanvas;
    const qualityScore = preprocessResult.qualityScore;
    await completeStep(1, 20);

    // Load original for annotation
    await activateStep(2, 'Isolating individual tooth regions...');
    const origImg = await ImageProcessor.loadImage(AppState.currentFile);
    const origCanvas = document.createElement('canvas');
    ImageProcessor.drawToCanvas(origImg, origCanvas);
    AppState.originalCanvas = origCanvas;
    await sleep(600);
    await completeStep(2, 42);

    // 2. Detection
    const origCtx = AppState.originalCanvas.getContext('2d');
    const origImageData = origCtx.getImageData(0, 0, AppState.originalCanvas.width, AppState.originalCanvas.height);
    const teeth = await ToothDetector.detect(origImageData, AppState.originalCanvas.width, AppState.originalCanvas.height);
    AppState.currentTeeth = teeth;
    await completeStep(2, 58);

    // 3. Classification
    await activateStep(3, 'Classifying teeth: Decayed / Missing / Filled / Healthy...');
    await sleep(700);
    await completeStep(3, 72);

    // 4. DMFT Calculation
    await activateStep(4, 'Calculating DMFT index and severity...');
    const report = DMFTCalculator.calculate(teeth);
    AppState.currentReport = report;
    await sleep(400);
    await completeStep(4, 86);

    // 5. Save Scan to DB and Report
    await activateStep(5, 'Generating annotated report...');
    
    // Save Scan logic
    const imageDataUrl = AppState.originalCanvas.toDataURL('image/jpeg', 0.6);
    AppState.currentScan = DB.saveScan({
      patientId: AppState.currentPatient ? AppState.currentPatient.id : 'anonymous',
      teeth: AppState.currentTeeth,
      report: AppState.currentReport,
      qualityScore,
      imageDataUrl
    }, (doctor.id || doctor._id));

    await sleep(500);
    await completeStep(5, 100);

    await sleep(600);
    renderResults(teeth, report, qualityScore);
    showSection('sectionResults');

  } catch (err) {
    console.error(err);
    showToast('Analysis failed: ' + err.message, 'error');
    showSection('sectionUpload');
  }
}

// Pipeline Animations
async function activateStep(num, subtitle) {
  for (let i = 1; i <= 5; i++) {
    const icon = $(`step${i}`).querySelector('.ps-icon');
    if (i < num && !icon.classList.contains('done')) {
      icon.className = 'ps-icon done'; icon.textContent = '✓';
      $(`step${i}`).classList.add('done');
    }
  }
  const step = $(`step${num}`);
  step.querySelector('.ps-icon').className = 'ps-icon active';
  step.classList.add('active');
  $('processingSubtitle').textContent = subtitle;
}

async function completeStep(num, progress) {
  const step = $(`step${num}`);
  step.querySelector('.ps-icon').className = 'ps-icon done';
  step.querySelector('.ps-icon').textContent = '✓';
  step.classList.replace('active', 'done');
  $('progressBar').style.width = progress + '%';
  await sleep(200);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Render Results ──────────────────────────────────────────────────────────
function renderResults(teeth, report, qualityScore) {
  const patient = AppState.currentPatient;
  $('resultPatientInfo').textContent = `${patient.name} · Age ${patient.age} · ${patient.gender} · ID: ${patient.id}`;

  const origCanvas = $('originalCanvas');
  origCanvas.width = AppState.originalCanvas.width;
  origCanvas.height = AppState.originalCanvas.height;
  origCanvas.getContext('2d').drawImage(AppState.originalCanvas, 0, 0);

  if ($('chkHeatmap')) $('chkHeatmap').checked = false;

  Annotator.annotate(AppState.originalCanvas, $('annotatedCanvas'), teeth, false);
  Annotator.renderEnhanced(AppState.enhancedCanvas, $('enhancedCanvas'));

  // Read rich metadata from API if available
  const meta = teeth._meta || {};

  // Update simulation warning banner visibility and trigger warning modal
  const warningBanner = $('simulationWarningBanner');
  if (warningBanner) {
    if (meta.is_simulation) {
      warningBanner.classList.remove('hidden');
      showOfflineWarningModal();
    } else {
      warningBanner.classList.add('hidden');
    }
  }

  // DMFT — prefer API value
  const dmft = meta.dmft_score !== undefined ? meta.dmft_score : report.dmft;
  $('dmftValue').textContent = dmft;

  // Summary counts — prefer API summary
  const summary = meta.summary || {};
  $('countDecayed').textContent = summary.decayed !== undefined ? summary.decayed : report.D;
  $('countMissing').textContent  = summary.missing  !== undefined ? summary.missing  : report.M;
  $('countFilled').textContent   = summary.filled   !== undefined ? summary.filled   : report.F;
  $('countHealthy').textContent  = summary.healthy  !== undefined ? summary.healthy  : report.H;

  const sevEl = $('dmftSeverity');
  sevEl.textContent = report.severity.label + ' Caries Experience';
  sevEl.className = 'dmft-severity ' + report.severity.cssClass;

  // Caries Risk badge
  const riskEl = $('cariesRiskBadge');
  if (riskEl) {
    const risk = meta.caries_risk || 'Low';
    const riskClass = { 'Very Low': 'risk-very-low', 'Low': 'risk-low', 'Moderate': 'risk-moderate', 'High': 'risk-high', 'Very High': 'risk-very-high' }[risk] || 'risk-low';
    riskEl.textContent = `🦷 Caries Risk: ${risk}`;
    riskEl.className = `caries-risk-badge ${riskClass}`;
  }

  // Bone Loss
  const boneLossEl = $('boneLossAlert');
  if (boneLossEl) {
    if (meta.bone_loss && meta.bone_loss.detected) {
      boneLossEl.innerHTML = `⚠️ Bone loss detected${meta.bone_loss.location ? ': ' + meta.bone_loss.location : ''}`;
      boneLossEl.classList.remove('hidden');
    } else {
      boneLossEl.classList.add('hidden');
    }
  }

  // Image quality
  const iqEl = $('imageQualityVal');
  if (iqEl) iqEl.textContent = meta.image_quality || 'Good';

  // Radiologist notes
  const notesEl = $('radiologistNotes');
  if (notesEl && meta.radiologist_notes) notesEl.textContent = meta.radiologist_notes;

  // Abnormalities
  const abnEl = $('abnormalitiesText');
  if (abnEl) abnEl.textContent = meta.abnormalities || 'None detected';

  // Agreement stats
  const agr = meta.agreements || {};
  if ($('agreementHigh'))   $('agreementHigh').textContent   = agr.high   || 0;
  if ($('agreementMedium')) $('agreementMedium').textContent = agr.medium || 0;
  if ($('agreementLow'))    $('agreementLow').textContent    = agr.low    || 0;

  // Urgent teeth panel
  const urgentEl = $('urgentTeethList');
  if (urgentEl) {
    const urgent = meta.urgent_teeth || [];
    urgentEl.innerHTML = urgent.length
      ? urgent.map(f => `<span class="tooth-flag urgent">FDI ${f}</span>`).join('')
      : '<span class="no-findings">None</span>';
  }

  // Monitor teeth panel
  const monitorEl = $('monitorTeethList');
  if (monitorEl) {
    const monitor = meta.monitor_teeth || [];
    monitorEl.innerHTML = monitor.length
      ? monitor.map(f => `<span class="tooth-flag monitor">FDI ${f}</span>`).join('')
      : '<span class="no-findings">None</span>';
  }

  // Confidence bars
  const overallConf = meta.overall_confidence || Math.round(72 + qualityScore * 0.2);
  if ($('confOverall')) $('confOverall').style.width = overallConf + '%';
  if ($('confOverallVal')) $('confOverallVal').textContent = overallConf + '%';
  const apiQualityScore = meta.image_quality_score !== undefined ? meta.image_quality_score : qualityScore;
  if ($('confQuality')) $('confQuality').style.width = apiQualityScore + '%';
  if ($('confQualityVal')) $('confQualityVal').textContent = apiQualityScore + '%';

  const decayTeeth   = teeth.filter(t => t.status === 'Decayed');
  const missingTeeth = teeth.filter(t => t.status === 'Missing');
  const filledTeeth  = teeth.filter(t => t.status === 'Filled');

  const avg = arr => arr.length > 0 ? Math.round(arr.reduce((s, t) => s + t.confidence, 0) / arr.length) : null;
  const avgDecay   = avg(decayTeeth)   || 87;
  const avgMissing = avg(missingTeeth) || 73;
  const avgFilled  = avg(filledTeeth)  || 68;

  if ($('confDecay')) $('confDecay').style.width = avgDecay + '%';
  if ($('confDecayVal')) $('confDecayVal').textContent = avgDecay + '%';
  if ($('confMissing')) $('confMissing').style.width = avgMissing + '%';
  if ($('confMissingVal')) $('confMissingVal').textContent = avgMissing + '%';
  if ($('confFilled')) $('confFilled').style.width = avgFilled + '%';
  if ($('confFilledVal')) $('confFilledVal').textContent = avgFilled + '%';

  renderToothChart(teeth);
  renderToothTable(teeth);
  renderRecommendations(report);
}

// Tooth Chart
function renderToothChart(teeth) {
  const chart = $('toothChart'); chart.innerHTML = '';

  const STATUS_ICONS = {
    Healthy: '✓', Decayed: '✕', Missing: '–', Filled: '◉',
    Impacted: '!', Root_Fragment: '↓', Needs_Review: '?'
  };

  // Standard FDI ordering (patient right is on the left side of the screen)
  const upperOrder = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const lowerOrder = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  const upper = upperOrder.map(fdi => teeth.find(t => t.fdi == fdi) || { fdi, status: 'Healthy' });
  const lower = lowerOrder.map(fdi => teeth.find(t => t.fdi == fdi) || { fdi, status: 'Healthy' });

  const buildRow = (tArr) => {
    const row = document.createElement('div'); row.className = 'chart-row';
    tArr.forEach(t => {
      const status = t.status || 'Healthy';
      const agreeClass = t.agreement === 'low' ? ' disagreement' : (t.agreement === 'medium' ? ' medium-agree' : '');
      const icon = STATUS_ICONS[status] || '?';
      const sevLabel = t.severity ? ` [${t.severity}]` : '';
      const tooltip = `FDI ${t.fdi}: ${status}${sevLabel} (${t.confidence}%) · ${t.flag || ''} ${t.agreement || 'high'} agreement`;
      row.innerHTML += `
        <div class="chart-tooth-wrap" title="${tooltip}" onclick="openOverrideModal(${t.fdi})" style="cursor: pointer;">
          <div class="chart-tooth ${status.toLowerCase()}${agreeClass}">
            <span class="ct-icon">${icon}</span>
          </div>
          <div class="chart-tooth-num">${t.fdi}</div>
        </div>`;
    });
    return row;
  };

  const upperLabel = document.createElement('div');
  upperLabel.className = 'chart-label'; upperLabel.textContent = '▲ Upper Arch';
  chart.appendChild(upperLabel);
  chart.appendChild(buildRow(upper));

  const lowerLabel = document.createElement('div');
  lowerLabel.className = 'chart-label'; lowerLabel.textContent = '▼ Lower Arch';
  chart.appendChild(lowerLabel);
  chart.appendChild(buildRow(lower));

  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  legend.innerHTML = `
    <div class="cl-item"><div class="cl-dot healthy"></div>Healthy ✓</div>
    <div class="cl-item"><div class="cl-dot decayed"></div>Decayed ✕</div>
    <div class="cl-item"><div class="cl-dot missing"></div>Missing –</div>
    <div class="cl-item"><div class="cl-dot filled"></div>Filled ◉</div>
    <div class="cl-item"><div class="cl-dot impacted" style="background: #8b5cf6;"></div>Impacted !</div>
    <div class="cl-item"><div class="cl-dot needs_review"></div>Review ?</div>
  `;
  chart.appendChild(legend);
}

// Tooth Table
function renderToothTable(teeth) {
  const tbody = $('toothTableBody'); tbody.innerHTML = '';

  // Update table headers to include Severity
  const thead = tbody.closest('table') && tbody.closest('table').querySelector('thead tr');
  if (thead && thead.children.length < 6) {
    thead.innerHTML = '<th>FDI</th><th>Tooth</th><th>Status</th><th>Severity</th><th>Confidence</th><th>Consensus</th>';
  }

  teeth.slice().sort((a,b) => {
    const order = { Decayed: 0, Needs_Review: 1, Impacted: 2, Root_Fragment: 3, Missing: 4, Filled: 5, Healthy: 6 };
    const oa = order[a.status] !== undefined ? order[a.status] : 6;
    const ob = order[b.status] !== undefined ? order[b.status] : 6;
    if (oa !== ob) return oa - ob;
    if (a.agreement === 'low'  && b.agreement !== 'low')  return -1;
    if (a.agreement !== 'low'  && b.agreement === 'low')  return 1;
    return a.fdi - b.fdi;
  }).forEach(t => {
    const flag = t.flag || (t.agreement === 'high' ? '✅' : t.agreement === 'medium' ? '⚠️' : '🔴');
    const agrLabel = t.agreement === 'high' ? 'High' : t.agreement === 'medium' ? 'Medium' : 'Disputed';
    const agrStyle = t.agreement === 'high'
      ? 'background:rgba(52,211,153,0.12);color:#34d399;border:1px solid rgba(52,211,153,0.3)'
      : t.agreement === 'medium'
        ? 'background:rgba(251,191,36,0.12);color:#fbbf24;border:1px solid rgba(251,191,36,0.3)'
        : 'background:rgba(248,113,113,0.12);color:#f87171;border:1px solid rgba(248,113,113,0.3)';

    const sevHtml = t.severity
      ? `<span class="severity-badge ${t.severity}">${t.severity}</span>`
      : '<span style="color:var(--text-muted)">—</span>';

    const votes = t.model1_status || t.model2_status
      ? `<div class="model-votes" title="M1: ${t.model1_status||'?'} · M2: ${t.model2_status||'?'} · M3: ${t.model3_status||'?'}">${flag} ${agrLabel}</div>`
      : `<span class="status-badge" style="${agrStyle}">${flag} ${agrLabel}</span>`;

    tbody.innerHTML += `
      <tr class="${t.agreement === 'low' ? 'row-disputed' : ''}" onclick="openOverrideModal(${t.fdi})" style="cursor: pointer;">
        <td><strong>${t.fdi}</strong></td>
        <td>${t.name}</td>
        <td><span class="status-badge ${(t.status||'healthy').toLowerCase()}">${t.status}</span></td>
        <td>${sevHtml}</td>
        <td><strong>${t.confidence}%</strong></td>
        <td><span class="status-badge" style="${agrStyle};font-weight:600">${flag} ${agrLabel}</span></td>
      </tr>
    `;
  });
}

window.toggleHeatmap = function(checked) {
  if (checked) {
    toggleView('annotated');
  }
  if (AppState.originalCanvas && AppState.currentTeeth) {
    Annotator.annotate(AppState.originalCanvas, $('annotatedCanvas'), AppState.currentTeeth, checked);
  }
};

function renderRecommendations(report) {
  const recs = DMFTCalculator.getRecommendations(report);
  const container = $('recommendationContent'); container.innerHTML = '';
  recs.forEach(r => { container.innerHTML += `<div class="rec-item ${r.type}"><span class="rec-icon">${r.icon}</span><span>${r.text}</span></div>`; });
}

window.toggleView = function(view) {
  ['original','annotated','enhanced'].forEach(v => {
    $(`${v}Canvas`).classList.add('hidden');
    $(`btn${v.charAt(0).toUpperCase()+v.slice(1)}`).classList.remove('active');
  });
  $(`${view}Canvas`).classList.remove('hidden');
  $(`btn${view.charAt(0).toUpperCase()+view.slice(1)}`).classList.add('active');
};

// Removed recursive showSection override

// ─── Doctor Patients List ──────────────────────────────────────────────────
function renderPatientsList(query = '') {
  const doctor = AuthManager.getUser();
  let patients = DB.getPatientsByDoctor((doctor.id || doctor._id));
  
  if (query) {
    const q = query.toLowerCase();
    patients = patients.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }

  const grid = $('patientsList');
  const empty = $('patientsEmpty');
  grid.innerHTML = '';

  if (!patients.length) {
    grid.classList.add('hidden'); empty.classList.remove('hidden'); return;
  }
  grid.classList.remove('hidden'); empty.classList.add('hidden');

  patients.forEach(p => {
    const scans = DB.getScansByPatient(p.id);
    const lastScan = scans[0]; // most recent
    
    let scoresHtml = '<span class="pc-badge dmft">No analyses yet</span>';
    if (lastScan) {
      scoresHtml = `
        <span class="pc-badge dmft">DMFT ${lastScan.report.dmft}</span>
        <span class="pc-badge decayed">D: ${lastScan.report.D}</span>
        <span class="pc-badge missing">M: ${lastScan.report.M}</span>
        <span class="pc-badge filled">F: ${lastScan.report.F}</span>
      `;
    }

    const initials = p.name.slice(0,2).toUpperCase();
    grid.innerHTML += `
      <div class="patient-card">
        <div class="pc-header">
          <div class="pc-avatar">${initials}</div>
          <div><div class="pc-name">${p.name}</div><div class="pc-meta">${p.age} yrs · ${p.gender}</div></div>
        </div>
        <div class="pc-scores">${scoresHtml}</div>
        <div class="pc-actions"><button class="pc-btn" onclick="alert('View history not fully implemented in demo')">View History</button></div>
      </div>
    `;
  });
}
window.filterPatients = renderPatientsList;

// ─── Utility ────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'info') {
  const toast = $('toast');
  if (toast) {
    toast.textContent = msg; toast.className = 'toast show ' + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3800);
  }
}

// ─── Manual Override ────────────────────────────────────────────────────────
window.openOverrideModal = function(fdi) {
  const tooth = AppState.currentTeeth.find(t => t.fdi === fdi);
  if (!tooth) return;

  $('overrideFdi').value = fdi;
  $('overrideFdiDisplay').value = `FDI ${fdi} - ${tooth.name}`;
  $('overrideStatus').value = tooth.status;
  window.onOverrideStatusChange(tooth.status);

  if (tooth.severity) {
    $('overrideSeverity').value = tooth.severity.toLowerCase();
  } else {
    $('overrideSeverity').value = 'moderate';
  }

  $('overrideNotes').value = tooth.notes || '';

  $('modalOverride').classList.remove('hidden');
};

window.closeOverrideModal = function() {
  $('modalOverride').classList.add('hidden');
};

window.showOfflineWarningModal = function() {
  const modal = $('modalOfflineWarning');
  if (modal) modal.classList.remove('hidden');
};

window.closeOfflineWarningModal = function() {
  const modal = $('modalOfflineWarning');
  if (modal) modal.classList.add('hidden');
};

window.onOverrideStatusChange = function(status) {
  const sevGroup = $('overrideSeverityGroup');
  if (status === 'Decayed') {
    sevGroup.style.display = 'block';
  } else {
    sevGroup.style.display = 'none';
  }
};

window.saveOverride = function() {
  const fdi = parseInt($('overrideFdi').value);
  const status = $('overrideStatus').value;
  const severity = status === 'Decayed' ? $('overrideSeverity').value : null;
  const notes = $('overrideNotes').value.trim();

  const tooth = AppState.currentTeeth.find(t => t.fdi === fdi);
  if (!tooth) return;

  // Apply manual override
  tooth.status = status;
  tooth.confidence = 100; // Manual intervention is 100% confident
  tooth.severity = severity;
  tooth.notes = notes ? notes : `Manual override: ${status}`;
  tooth.agreement = 'high';
  tooth.flag = '✅';
  tooth.consensus = true;

  // Recalculate DMFT and update report
  const newReport = DMFTCalculator.calculate(AppState.currentTeeth);
  AppState.currentReport = newReport;

  // Update _meta for rendering
  AppState.currentTeeth._meta = AppState.currentTeeth._meta || {};
  AppState.currentTeeth._meta.dmft_score = newReport.dmft;
  AppState.currentTeeth._meta.summary = {
    decayed: newReport.D,
    missing: newReport.M,
    filled: newReport.F,
    healthy: newReport.H,
    needs_review: AppState.currentTeeth.filter(t => t.status === 'Needs_Review').length,
    impacted: AppState.currentTeeth.filter(t => t.status === 'Impacted').length,
    total: AppState.currentTeeth.length
  };

  // Recalculate average confidence metrics for overridden data
  const decayTeeth   = AppState.currentTeeth.filter(t => t.status === 'Decayed');
  const missingTeeth = AppState.currentTeeth.filter(t => t.status === 'Missing');
  const filledTeeth  = AppState.currentTeeth.filter(t => t.status === 'Filled');

  const avg = arr => arr.length > 0 ? Math.round(arr.reduce((s, t) => s + t.confidence, 0) / arr.length) : 0;
  const decayAvg = avg(decayTeeth);
  const missingAvg = avg(missingTeeth);
  const filledAvg = avg(filledTeeth);

  const activeSubcategories = [decayAvg, missingAvg, filledAvg].filter(c => c > 0);
  let overallConf = activeSubcategories.length ? Math.round(activeSubcategories.reduce((s, c) => s + c, 0) / activeSubcategories.length) : 100;
  const lowestSubcategory = Math.min(...(activeSubcategories.length ? activeSubcategories : [100]));
  if (overallConf > lowestSubcategory) overallConf = lowestSubcategory;

  AppState.currentTeeth._meta.overall_confidence = overallConf;
  AppState.currentTeeth._meta.final_confidence_metrics = {
    overall: overallConf,
    decay: decayAvg,
    missing: missingAvg,
    filling: filledAvg
  };

  // Update caries risk
  let risk = 'Low';
  if (newReport.dmft <= 0) risk = 'Very Low';
  else if (newReport.dmft <= 5) risk = 'Low';
  else if (newReport.dmft <= 9) risk = 'Moderate';
  else if (newReport.dmft <= 13) risk = 'High';
  else risk = 'Very High';
  
  AppState.currentTeeth._meta.caries_risk = risk;

  // Update flags lists
  AppState.currentTeeth._meta.urgent_teeth = AppState.currentTeeth.filter(t => t.status === 'Decayed').map(t => t.fdi);
  AppState.currentTeeth._meta.monitor_teeth = AppState.currentTeeth.filter(t => t.status === 'Needs_Review').map(t => t.fdi);

  // Save changes to local database if we have a current scan
  if (AppState.currentScan && AppState.currentScan.id) {
    const doctor = AuthManager.getUser();
    DB.updateScan(AppState.currentScan.id, {
      teeth: AppState.currentTeeth,
      report: AppState.currentReport
    }, (doctor.id || doctor._id));
  }

  // Re-render all results elements
  const qualityScore = AppState.currentScan ? AppState.currentScan.qualityScore : 90;
  renderResults(AppState.currentTeeth, newReport, qualityScore);

  closeOverrideModal();
  showToast(`Tooth ${fdi} overridden successfully to ${status}`, 'success');
};

window.openMyProfileModal = function() { const user = AuthManager.getUser(); if (!user) return; const dropdown = document.getElementById('userProfileDropdown'); if (dropdown) dropdown.classList.add('hidden'); document.getElementById('mpName').textContent = user.name || (user.firstName ? user.firstName + ' ' + user.lastName : user.username); document.getElementById('mpRole').textContent = (user.specialty || user.role || '').toUpperCase(); document.getElementById('mpUsername').textContent = user.username || 'N/A'; document.getElementById('mpEmail').textContent = user.email || 'N/A'; document.getElementById('mpDOB').textContent = user.dob || 'N/A'; document.getElementById('mpGender').textContent = user.gender || 'N/A'; document.getElementById('mpMobile').textContent = user.mobile || 'N/A'; document.getElementById('mpStatus').textContent = (user.status || 'Active').toUpperCase(); document.getElementById('mpAddress').textContent = user.address || 'N/A'; document.getElementById('modalMyProfile').classList.remove('hidden'); }; window.closeMyProfileModal = function() { document.getElementById('modalMyProfile').classList.add('hidden'); };

window.openEditProfileModal = function() {
  const user = AuthManager.getUser();
  if (!user) return;
  
  const dropdown = document.getElementById('userProfileDropdown');
  if (dropdown) dropdown.classList.add('hidden');
  
  const epOld = document.getElementById('epOldPassword'); if(epOld) epOld.value = '';
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
  const oldPass = document.getElementById('epOldPassword').value.trim();
  const newPass = document.getElementById('epNewPassword').value.trim();
  if (!oldPass) return alert('Please enter your current password');
  if (!newPass) return alert('Please enter a new password');
  
  try {
    const res = await fetch('https://swift-worms-own.loca.lt/api/users/' + (user.id || user._id) + '/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
      body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
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

window.savePatient = function() {
  const name = $('patientName').value.trim();
  const age = parseInt($('patientAge').value);
  const gender = $('patientGender').value;
  const notes = $('clinicalNotes').value.trim();
  
  if(!name || isNaN(age)) {
    showToast('Please provide Patient Name and Age.', 'error');
    return;
  }
  
  const user = AuthManager.getUser();
  const patientData = { name, age, gender, notes, doctorId: (user.id || user._id) };
  let patient = DB.savePatient(patientData);
  
  showToast('Patient created successfully!', 'success');
  
  $('patientName').value = '';
  $('patientAge').value = '';
  $('patientGender').value = '';
  $('clinicalNotes').value = '';
  
  showSection('sectionPatientsList');
  renderPatientsList();
};

window.populatePatientDropdown = function() {
  const user = AuthManager.getUser();
  if(!user) return;
  const patients = DB.getPatientsByDoctor((user.id || user._id)) || [];
  const select = $('aiPatientSelect');
  if(!select) return;
  
  select.innerHTML = '<option value="">Select a patient...</option>';
  patients.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name + ' (' + p.id + ')';
    select.appendChild(opt);
  });
};

window.checkUploadStatus = function() {
  const patientId = $('aiPatientSelect') ? $('aiPatientSelect').value : null;
  const hasImage = !$('dzPreview').classList.contains('hidden');
  if (patientId && hasImage) {
    $('analyzeBtn').removeAttribute('disabled');
  } else {
    $('analyzeBtn').setAttribute('disabled', 'true');
  }
};

