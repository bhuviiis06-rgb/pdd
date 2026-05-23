const fs = require('fs');

const resLayoutPatch = `
/* ================================================
   RESEARCHER LAYOUT MOBILE OVERRIDES
   ================================================ */
@media screen and (max-width: 768px) {
  .research-layout {
    grid-template-columns: 1fr !important;
    height: auto !important;
  }
}
`;

fs.appendFileSync('css/style.css', resLayoutPatch);
console.log('Research layout mobile overrides appended.');
