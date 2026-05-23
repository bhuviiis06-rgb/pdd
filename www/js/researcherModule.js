/**
 * DentAI – Researcher Module
 * Handles anonymized case studies and research note management.
 */

const ResearcherModule = (() => {

  let currentScanId = null;

  function renderDashboard() {
    const scans = DB.getAllScansAnonymized();
    const listEl = document.getElementById('researchScansList');
    listEl.innerHTML = '';

    if (scans.length === 0) {
      listEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">No anonymized case studies available.</div>';
      return;
    }

    scans.forEach(scan => {
      const d = new Date(scan.timestamp);
      const item = document.createElement('div');
      item.className = 'rs-item';
      item.onclick = () => selectScan(scan.id, item);
      item.innerHTML = `
        <div class="rs-id">CASE: ${scan.id.split('_')[1].toUpperCase()}</div>
        <div class="rs-meta">DMFT: ${scan.dmft} | ${scan.severity}</div>
        <div class="rs-meta" style="margin-top:4px">${d.toLocaleDateString()}</div>
      `;
      listEl.appendChild(item);
    });
  }

  function selectScan(scanId, el) {
    document.querySelectorAll('.rs-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    
    currentScanId = scanId;
    document.getElementById('rsEmptyState').classList.add('hidden');
    document.getElementById('researchScanDetailCard').classList.remove('hidden');

    const scans = DB.getAllScansAnonymized();
    const scan = scans.find(s => s.id === scanId);

    document.getElementById('rsDetailTitle').textContent = `Case Study: ${scan.id.split('_')[1].toUpperCase()}`;
    document.getElementById('rsDetailDmft').textContent = `DMFT ${scan.dmft}`;
    
    document.getElementById('rsAge').textContent = scan.patientAge;
    document.getElementById('rsGender').textContent = scan.patientGender;
    document.getElementById('rsSeverity').textContent = scan.severity;
    document.getElementById('rsDate').textContent = new Date(scan.timestamp).toLocaleDateString();

    document.getElementById('rsImagePreview').src = scan.imageDataUrl || '';
    
    document.getElementById('rsToothSummary').innerHTML = `
      Decayed: ${scan.report.D} | Missing: ${scan.report.M} | Filled: ${scan.report.F} | Healthy: ${scan.report.H}
    `;

    renderNotes(scanId);
  }

  function renderNotes(scanId) {
    const notes = DB.getResearchNotesByScan(scanId);
    const container = document.getElementById('rsNotesList');
    container.innerHTML = '';

    if (notes.length === 0) {
      container.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">No notes for this case yet.</div>';
      return;
    }

    notes.forEach(note => {
      const div = document.createElement('div');
      div.className = 'rn-item';
      div.innerHTML = `
        <div class="rn-title">${note.title}</div>
        <div class="rn-content">${note.content}</div>
        <div class="rn-meta">${new Date(note.timestamp).toLocaleString()} | Author ID: ${note.researcherId.split('_')[1]}</div>
      `;
      container.appendChild(div);
    });
  }

  // Hook for the global function in index.html
  window.saveResearchNote = function() {
    if (!currentScanId) return;
    const title = document.getElementById('rnTitle').value.trim();
    const content = document.getElementById('rnContent').value.trim();
    if (!title || !content) {
      alert("Please provide both title and content for the note.");
      return;
    }

    const user = AuthManager.getUser();
    DB.saveResearchNote(currentScanId, user.id, title, content, []);
    
    // Reset form and re-render
    document.getElementById('rnTitle').value = '';
    document.getElementById('rnContent').value = '';
    renderNotes(currentScanId);
  };

  return { renderDashboard };
})();


// --- Academic Workflow Additions ---
window.switchResTab = function(tabId) {
  document.querySelectorAll('.res-tab-btn').forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');
  document.getElementById('resTabCaseStudies').classList.add('hidden');
  document.getElementById('resTabLiterature').classList.add('hidden');
  document.getElementById('resTabSavedNotes').classList.add('hidden');
  if (tabId === 'cases') document.getElementById('resTabCaseStudies').classList.remove('hidden');
  if (tabId === 'literature') {
    document.getElementById('resTabLiterature').classList.remove('hidden');
    renderLiteratureLibrary();
  }
  if (tabId === 'notes') {
    document.getElementById('resTabSavedNotes').classList.remove('hidden');
    renderSavedNotesDashboard();
  }
};

const mockLiterature = [
  { id: 'lit1', type: 'Paper', title: 'Deep Learning for Automated Dental Caries Detection on OPG Radiographs', authors: 'Smith J., Doe A., Lee C.', year: 2024, journal: 'Journal of Dental Informatics', abstract: 'This study presents a novel YOLO-based architecture for the automated detection of dental caries. Evaluated on a dataset of 5,000 OPGs, the model achieved a sensitivity of 92% and specificity of 89%, outperforming human benchmarks in early lesion detection.' },
  { id: 'lit2', type: 'Review', title: 'Epidemiology of Early Childhood Caries in Urban Populations: A Systematic Review', authors: 'Williams K., Chen T.', year: 2025, journal: 'Global Oral Health Review', abstract: 'A systematic review analyzing 45 studies on Early Childhood Caries (ECC). The prevalence remains stubbornly high at 48% in lower-income urban brackets. The paper highlights the urgency for AI-driven rapid screening at primary care levels.' },
  { id: 'lit3', type: 'Book', title: 'Artificial Intelligence in Dentistry: Clinical Applications', authors: 'Dr. Sarah Jenkins', year: 2026, journal: 'Elsevier Health Sciences', abstract: 'A comprehensive textbook covering the paradigm shift AI brings to dental diagnostics. Chapter 4 explicitly discusses panoramic radiography interpretation via convolutional neural networks.' }
];

window.renderLiteratureLibrary = function() {
  const list = document.getElementById('litLibraryList');
  if (!list) return;
  list.innerHTML = '';
  mockLiterature.forEach(lit => {
    const item = document.createElement('div');
    item.className = 'rl-item';
    item.style.padding = '12px';
    item.style.borderBottom = '1px solid var(--border)';
    item.style.cursor = 'pointer';
    item.innerHTML = `<div style="font-weight: 500; margin-bottom: 4px; font-size: 13px; color: var(--text-primary);">${lit.title}</div><div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">${lit.authors} (${lit.year}) - ${lit.type.toUpperCase()}</div><div style="font-size: 11px; color: var(--blue);">${lit.journal}</div>`;
    item.onclick = () => {
      document.querySelectorAll('#litLibraryList .rl-item').forEach(el => el.style.background = 'transparent');
      item.style.background = 'rgba(59, 130, 246, 0.1)';
      openLiterature(lit);
    };
    list.appendChild(item);
  });
};

window.openLiterature = function(lit) {
  document.getElementById('litEmptyState').classList.add('hidden');
  document.getElementById('litDetailCard').classList.remove('hidden');
  document.getElementById('litTitle').textContent = lit.title;
  document.getElementById('pdfViewerTitle').textContent = lit.title;
  document.getElementById('pdfViewerAbstract').textContent = lit.abstract;
  document.getElementById('litCitationApa').textContent = `${lit.authors} (${lit.year}). ${lit.title}. ${lit.journal}.`;
  document.getElementById('litRelatedStudies').innerHTML = `<div style="font-size: 11px; color: var(--blue); cursor:pointer; margin-bottom:4px;">1. Automated Cephalometric Analysis via CNNs (2023)</div><div style="font-size: 11px; color: var(--blue); cursor:pointer;">2. The Future of Teledentistry (2025)</div>`;
};

window.copyCitation = function() {
  navigator.clipboard.writeText(document.getElementById('litCitationApa').textContent);
  alert('Citation copied to clipboard!');
};

window.savedAcademicNotes = [];
window.saveLitNote = function() {
  const content = document.getElementById('litNoteContent').value;
  if (!content) return alert('Note cannot be empty.');
  const title = document.getElementById('litTitle').textContent;
  savedAcademicNotes.push({ id: Date.now(), source: 'Literature', context: title, content: content, date: new Date().toLocaleDateString() });
  document.getElementById('litNoteContent').value = '';
  alert('Academic Note Saved successfully!');
};

window.renderSavedNotesDashboard = function() {
  const grid = document.getElementById('allSavedNotesGrid');
  const empty = document.getElementById('allNotesEmptyState');
  if (!grid) return;
  grid.innerHTML = '';
  
  let allNotes = [...savedAcademicNotes];
  const user = AuthManager.getUser();
  if (user && window.DB) {
    const notes = DB.getResearchNotesByResearcher(user.id);
    notes.forEach(n => {
      const d = new Date(n.timestamp);
      const timeStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
      allNotes.push({ id: n.id, source: 'Case Study', context: n.title || ('Scan ID: ' + n.scanId), content: n.content, date: timeStr });
    });
  }
  
  if (allNotes.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  allNotes.sort((a,b) => new Date(b.date) - new Date(a.date));
  allNotes.forEach(note => {
    const card = document.createElement('div');
    card.style.background = 'var(--surface)'; card.style.border = '1px solid var(--border)'; card.style.borderRadius = 'var(--radius-md)'; card.style.padding = '16px';
    card.innerHTML = `<div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span style="font-size:10px; padding:2px 6px; background:var(--blue); color:#fff; border-radius:4px;">${note.source}</span>
        <span style="font-size:11px; color:var(--text-muted);">${note.date}</span>
      </div>
      <div style="font-size:13px; font-weight:500; margin-bottom:8px; color:var(--text-primary);">${note.context}</div>
      <div style="font-size:12px; color:var(--text-secondary); line-height:1.5;">${note.content}</div>`;
    grid.appendChild(card);
  });
};

window.exportNotes = function() {
  alert('Exporting notes to CSV...');
};

// --- Close Active Research Scan ---
window.closeResearchScan = function() {
  document.getElementById('researchScanDetailCard').classList.add('hidden');
  document.getElementById('rsEmptyState').classList.remove('hidden');
  document.querySelectorAll('#researchScansList .rl-item').forEach(el => el.classList.remove('active'));
};
