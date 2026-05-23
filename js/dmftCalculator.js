/**
 * DentAI – DMFT Calculator Module
 * WHO standard DMFT Index calculation and clinical interpretation.
 *
 * DMFT = Decayed (D) + Missing (M) + Filled (F)
 * Range: 0–32 (adults, permanent dentition)
 *
 * WHO Severity Classification:
 *   0.0 – 1.1  : Very Low
 *   1.2 – 2.6  : Low
 *   2.7 – 4.4  : Moderate
 *   4.5 – 6.5  : High
 *   > 6.5      : Very High
 */

const DMFTCalculator = (() => {

  const WHO_THRESHOLDS = [
    { max: 1.1, label: 'Very Low',  cssClass: 'very-low',  color: '#34d399' },
    { max: 2.6, label: 'Low',       cssClass: 'low',       color: '#34d399' },
    { max: 4.4, label: 'Moderate',  cssClass: 'moderate',  color: '#fbbf24' },
    { max: 6.5, label: 'High',      cssClass: 'high',      color: '#fb923c' },
    { max: Infinity, label: 'Very High', cssClass: 'very-high', color: '#f87171' },
  ];

  /**
   * Calculate DMFT index from tooth detection results
   * @param {Array} teeth - Array of tooth detection results
   * @returns {Object} Full DMFT report
   */
  function calculate(teeth) {
    const counts = { Decayed: 0, Missing: 0, Filled: 0, Healthy: 0, Needs_Review: 0, Impacted: 0, Root_Fragment: 0 };
    const byStatus = { Decayed: [], Missing: [], Filled: [], Healthy: [], Needs_Review: [], Impacted: [], Root_Fragment: [] };

    for (const tooth of teeth) {
      counts[tooth.status]++;
      byStatus[tooth.status].push(tooth);
    }

    const D = counts.Decayed;
    const M = counts.Missing;
    const F = counts.Filled;
    const H = counts.Healthy;
    const total = teeth.length;

    const dmft = D + M + F;
    const severity = getSeverity(dmft);
    const percentageAffected = total > 0 ? Math.round(((D + M + F) / total) * 100) : 0;
    const restorationIndex   = (D + F) > 0 ? Math.round((F / (D + F)) * 100) : 0;

    // Quadrant breakdown
    const quadrantStats = {};
    for (const quad of ['UR', 'UL', 'LR', 'LL']) {
      const qTeeth = teeth.filter(t => t.quadrant === quad);
      quadrantStats[quad] = {
        total:   qTeeth.length,
        decayed: qTeeth.filter(t => t.status === 'Decayed').length,
        missing: qTeeth.filter(t => t.status === 'Missing').length,
        filled:  qTeeth.filter(t => t.status === 'Filled').length,
        healthy: qTeeth.filter(t => t.status === 'Healthy').length,
      };
    }

    return {
      dmft,
      D, M, F, H,
      total,
      severity,
      percentageAffected,
      restorationIndex,
      byStatus,
      quadrantStats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get WHO severity classification
   */
  function getSeverity(dmft) {
    for (const t of WHO_THRESHOLDS) {
      if (dmft <= t.max) return t;
    }
    return WHO_THRESHOLDS[WHO_THRESHOLDS.length - 1];
  }

  /**
   * Generate clinical recommendations based on DMFT score
   */
  function getRecommendations(report) {
    const recs = [];
    const { dmft, D, M, F, severity } = report;

    // Urgent: active decay
    if (D > 0) {
      recs.push({
        type: 'urgent',
        icon: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
        text: `${D} tooth${D > 1 ? 'teeth' : ''} with active caries detected. Immediate restorative treatment is recommended to prevent further progression and pulpal involvement.`,
      });
    }

    // Missing teeth
    if (M >= 3) {
      recs.push({
        type: 'urgent',
        icon: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
        text: `${M} missing teeth identified. Prosthetic rehabilitation (implants, bridge, or partial denture) is strongly advised to restore function and prevent bone resorption.`,
      });
    } else if (M > 0) {
      recs.push({
        type: 'moderate',
        icon: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`,
        text: `${M} missing tooth/teeth present. Discuss tooth replacement options with your dentist to prevent adjacent tooth drifting.`,
      });
    }

    // Filled teeth – monitor
    if (F > 0) {
      recs.push({
        type: 'routine',
        icon: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
        text: `${F} restored tooth/teeth detected. Regular follow-up recommended to monitor restoration integrity and detect secondary caries.`,
      });
    }

    // General DMFT-based advice
    if (dmft === 0) {
      recs.push({
        type: 'routine',
        icon: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
        text: 'Excellent dental health! No caries, missing, or filled teeth detected. Maintain current oral hygiene with bi-annual dental check-ups.',
      });
    } else if (severity.label === 'Moderate' || severity.label === 'High' || severity.label === 'Very High') {
      recs.push({
        type: 'urgent',
        icon: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>`,
        text: `DMFT of ${dmft} indicates ${severity.label.toLowerCase()} caries experience. Comprehensive treatment plan and fluoride therapy are recommended.`,
      });
    }

    // Fluoride and prevention
    recs.push({
      type: 'info',
      icon: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`,
      text: 'Preventive measures: Twice-daily fluoride toothpaste, flossing, sugar restriction, and regular dental scaling are recommended for all patients.',
    });

    return recs;
  }

  /**
   * Format a full textual summary for a patient report
   */
  function formatSummary(patient, report) {
    const { dmft, D, M, F, H, severity, total, percentageAffected, restorationIndex } = report;
    return {
      title: `DMFT Assessment Report – ${patient.name}`,
      date:  new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      lines: [
        `Patient: ${patient.name} | Age: ${patient.age} | Gender: ${patient.gender}`,
        `Total Teeth Analyzed: ${total}`,
        `─────────────────────────────────────────`,
        `Decayed  (D): ${D}   Missing (M): ${M}   Filled (F): ${F}   Healthy (H): ${H}`,
        `─────────────────────────────────────────`,
        `DMFT Score: ${dmft}  →  ${severity.label} Caries Experience`,
        `% Teeth Affected: ${percentageAffected}%`,
        `Restoration Index: ${restorationIndex}% (proportion of treated vs. affected)`,
      ],
    };
  }

  return { calculate, getSeverity, getRecommendations, formatSummary, WHO_THRESHOLDS };
})();
