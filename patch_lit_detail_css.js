const fs = require('fs');

const litDetailPatch = `
/* ================================================
   LITERATURE READER MOBILE OVERRIDES
   ================================================ */
@media screen and (max-width: 768px) {
  #litDetailCard .card-body {
    flex-direction: column !important;
    height: auto !important;
    gap: 16px !important;
  }
  #litDetailCard .card-body > div[style*="flex: 2"] {
    min-height: 400px;
    flex: none !important;
  }
  #litDetailCard .card-body > div[style*="flex: 1"] {
    flex: none !important;
  }
}
`;

fs.appendFileSync('css/style.css', litDetailPatch);
console.log('Literature Reader mobile overrides appended.');
