const fs = require('fs');

const code = `
// --- Close Active Research Scan ---
window.closeResearchScan = function() {
  document.getElementById('researchScanDetailCard').classList.add('hidden');
  document.getElementById('rsEmptyState').classList.remove('hidden');
  document.querySelectorAll('#researchScansList .rl-item').forEach(el => el.classList.remove('active'));
};
`;

fs.appendFileSync('js/researcherModule.js', code);
console.log('Appended closeResearchScan to researcherModule.js');
