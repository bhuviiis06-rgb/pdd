const fs = require('fs');

const hidePatientFormPatch = `
/* ================================================
   HIDE PATIENT DEMOGRAPHICS IN AI ANALYSIS
   ================================================ */
.patient-form-card {
  display: none !important;
}
#sectionAddPatient {
  display: none !important;
}
`;

fs.appendFileSync('css/style.css', hidePatientFormPatch);
console.log('Patient form hidden in CSS.');
