/**
 * DentAI – Patient Manager Module
 * LocalStorage-backed patient records management.
 * Stores full analysis results per patient session.
 */

const PatientManager = (() => {
  const STORAGE_KEY = 'dentai_patients_v2';

  function loadAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveAll(patients) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  }

  function generateId() {
    return 'PT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
  }

  /**
   * Save a new patient analysis record
   */
  function saveRecord(patient, dmftReport, teeth, imageDataUrl) {
    const patients = loadAll();
    const record = {
      id:          patient.id || generateId(),
      name:        patient.name,
      age:         patient.age,
      gender:      patient.gender,
      notes:       patient.notes,
      date:        new Date().toISOString(),
      dmft:        dmftReport.dmft,
      D:           dmftReport.D,
      M:           dmftReport.M,
      F:           dmftReport.F,
      H:           dmftReport.H,
      severity:    dmftReport.severity.label,
      totalTeeth:  dmftReport.total,
      teeth:       teeth.map(t => ({
        fdi:        t.fdi,
        name:       t.name,
        quadrant:   t.quadrant,
        status:     t.status,
        confidence: t.confidence,
      })),
      imageDataUrl: imageDataUrl || null,
    };
    patients.unshift(record);
    saveAll(patients);
    return record;
  }

  function getRecord(id) {
    return loadAll().find(p => p.id === id) || null;
  }

  function deleteRecord(id) {
    const patients = loadAll().filter(p => p.id !== id);
    saveAll(patients);
  }

  function searchRecords(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return loadAll();
    return loadAll().filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.gender || '').toLowerCase().includes(q)
    );
  }

  function getStats() {
    const all = loadAll();
    if (!all.length) return null;
    const avgDmft = all.reduce((s, p) => s + p.dmft, 0) / all.length;
    const maxDmft = Math.max(...all.map(p => p.dmft));
    return { total: all.length, avgDmft: avgDmft.toFixed(1), maxDmft };
  }

  return { loadAll, saveRecord, getRecord, deleteRecord, searchRecords, generateId, getStats };
})();
