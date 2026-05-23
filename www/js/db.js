/**
 * DentAI – Database Module
 * Advanced LocalStorage wrapper to simulate a relational database.
 * Handles Users, Patients, Scans, Research Notes, and System Logs.
 */

const DB = (() => {
  const STORAGE_KEY = 'dentai_platform_db_v3';

  const defaultData = {
    users: [
      { id: 'u_doc1', username: 'doctor', role: 'doctor', name: 'Dr. Sarah Jenkins', specialty: 'General Dentistry', created: new Date().toISOString() },
      { id: 'u_res1', username: 'researcher', role: 'researcher', name: 'Dr. Alan Turing', specialty: 'AI Epidemiology', created: new Date().toISOString() },
      { id: 'u_adm1', username: 'admin', role: 'admin', name: 'System Admin', specialty: 'Operations', created: new Date().toISOString() }
    ],
    patients: [],
    scans: [],
    researchNotes: [],
    systemLogs: []
  };

  // ─── Core DB Functions ───────────────────────────────────────────────

  function readDB() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const db = data ? JSON.parse(data) : defaultData;
      let modified = false;
      if (db.patients) {
        db.patients.forEach(p => {
          if (!p.id) {
            p.id = 'pat_' + Date.now() + Math.random().toString(36).substr(2, 5);
            modified = true;
          }
        });
      }
      if (modified) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      }
      return db;
    } catch {
      return defaultData;
    }
  }

  function writeDB(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function generateId(prefix = 'id') {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function logActivity(action, userId, details = {}) {
    const db = readDB();
    db.systemLogs.unshift({
      id: generateId('log'),
      timestamp: new Date().toISOString(),
      action,
      userId,
      details
    });
    // Keep last 500 logs to prevent bloat
    if (db.systemLogs.length > 500) db.systemLogs.pop();
    writeDB(db);
  }

  // ─── Users ──────────────────────────────────────────────────────────

  function getUser(username) {
    return readDB().users.find(u => u.username === username) || null;
  }
  
  function getUserById(id) {
    return readDB().users.find(u => u.id === id) || null;
  }

  function getAllUsers() {
    return readDB().users;
  }

  // ─── Patients ───────────────────────────────────────────────────────

  function savePatient(patientData, doctorId) {
    const db = readDB();
    const existing = db.patients.find(p => p.id === patientData.id);
    if (existing) {
      Object.assign(existing, patientData);
    } else {
      patientData.id = patientData.id || ('pat_' + Date.now() + Math.random().toString(36).substr(2, 5));
      patientData.doctorId = doctorId || patientData.doctorId;
      patientData.created = new Date().toISOString();
      db.patients.unshift(patientData);
    }
    writeDB(db);
    logActivity('PATIENT_SAVED', doctorId, { patientId: patientData.id });
    return patientData;
  }

  function getPatientsByDoctor(doctorId) {
    return readDB().patients.filter(p => p.doctorId === doctorId);
  }

  function getPatient(patientId) {
    return readDB().patients.find(p => String(p.id) === String(patientId)) || null;
  }

  // ─── Scans (Analyses) ────────────────────────────────────────────────

  function saveScan(scanData, doctorId) {
    const db = readDB();
    scanData.id = generateId('scan');
    scanData.doctorId = doctorId;
    scanData.timestamp = new Date().toISOString();
    db.scans.unshift(scanData);
    writeDB(db);
    logActivity('SCAN_ANALYZED', doctorId, { scanId: scanData.id, patientId: scanData.patientId });
    return scanData;
  }

  function getScansByDoctor(doctorId) {
    return readDB().scans.filter(s => s.doctorId === doctorId);
  }

  function getScansByPatient(patientId) {
    return readDB().scans.filter(s => s.patientId === patientId);
  }
  
  function getScan(scanId) {
    return readDB().scans.find(s => s.id === scanId) || null;
  }

  function updateScan(scanId, scanData, doctorId) {
    const db = readDB();
    const index = db.scans.findIndex(s => s.id === scanId);
    if (index !== -1) {
      db.scans[index] = { ...db.scans[index], ...scanData };
      writeDB(db);
      logActivity('SCAN_UPDATED', doctorId, { scanId: scanId, patientId: db.scans[index].patientId });
      return db.scans[index];
    }
    return null;
  }

  // For Researchers (Anonymized)
  function getAllScansAnonymized() {
    const db = readDB();
    return db.scans.map(scan => {
      const p = db.patients.find(pt => pt.id === scan.patientId) || {};
      // Return a deep copy without sensitive patient details
      
  function addUser(userObj) {
    const data = readDB();
    data.users.push(userObj);
    writeDB(data);
    return userObj;
  }
  return {
    addUser,
        id: scan.id,
        timestamp: scan.timestamp,
        dmft: scan.report.dmft,
        severity: scan.report.severity.label,
        patientAge: p.age || 'Unknown',
        patientGender: p.gender || 'Unknown',
        teeth: scan.teeth,
        report: scan.report, // Contains counts, but no names
        imageDataUrl: scan.imageDataUrl, // Image itself might have PPI in real world, but we assume it's cropped OPG here
      };
    });
  }

  // ─── Research Notes ──────────────────────────────────────────────────

  function saveResearchNote(scanId, researcherId, title, content, tags) {
    const db = readDB();
    const note = {
      id: generateId('note'),
      scanId,
      researcherId,
      title,
      content,
      tags,
      timestamp: new Date().toISOString()
    };
    db.researchNotes.unshift(note);
    writeDB(db);
    logActivity('RESEARCH_NOTE_CREATED', researcherId, { scanId, noteId: note.id });
    return note;
  }

  function getResearchNotesByResearcher(researcherId) {
    return readDB().researchNotes.filter(n => n.researcherId === researcherId);
  }
  
  function getResearchNotesByScan(scanId) {
    return readDB().researchNotes.filter(n => n.scanId === scanId);
  }

  // ─── Analytics (Admin) ───────────────────────────────────────────────

  function getPlatformStats() {
    const db = readDB();
    const totalScans = db.scans.length;
    let avgDmft = 0;
    if (totalScans > 0) {
      const sum = db.scans.reduce((acc, scan) => acc + scan.report.dmft, 0);
      avgDmft = sum / totalScans;
    }
    
    return {
      totalUsers: db.users.length,
      totalPatients: db.patients.length,
      totalScans,
      totalResearchNotes: db.researchNotes.length,
      avgDmft: avgDmft.toFixed(2),
      recentLogs: db.systemLogs.slice(0, 50)
    };
  }

  // Initialization check
  if (!localStorage.getItem(STORAGE_KEY)) {
    writeDB(defaultData);
  }

  return {
    generateId,
    getUser,
    getUserById,
    getAllUsers,
    savePatient,
    getPatientsByDoctor,
    getPatient,
    saveScan,
    updateScan,
    getScansByDoctor,
    getScansByPatient,
    getScan,
    getAllScansAnonymized,
    saveResearchNote,
    getResearchNotesByResearcher,
    getResearchNotesByScan,
    getPlatformStats
  };
})();

window.DB = DB;
