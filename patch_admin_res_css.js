const fs = require('fs');

const adminResQueries = `
/* ================================================
   ADMIN & RESEARCHER MOBILE OVERRIDES
   ================================================ */
@media screen and (max-width: 768px) {
  /* Scrollable Tabs */
  .res-tabs-container {
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 12px !important;
    gap: 8px !important;
  }
  .res-tab-btn {
    white-space: nowrap !important;
    flex-shrink: 0;
  }
  
  /* Inline grid overrides for Researcher */
  #allSavedNotesGrid {
    grid-template-columns: 1fr !important;
  }
  
  /* Inline flex overrides for Admin Create User Form */
  #adminCreateUserForm > div[style*="display:flex"] {
    flex-direction: column !important;
    gap: 0 !important;
    margin-bottom: 0 !important;
  }
  #adminCreateUserForm .form-group {
    margin-bottom: 14px;
  }
  
  /* Make sure tables do not overflow their container */
  .table-wrap {
    overflow-x: auto !important;
    max-width: calc(100vw - 32px);
  }
  .tooth-table th, .tooth-table td {
    white-space: nowrap;
  }
  
  /* User Profile Modal Inline Grid Override */
  #modalUserProfile .card-body > div[style*="grid-template-columns"] {
    grid-template-columns: 1fr !important;
  }
}
`;

fs.appendFileSync('css/style.css', adminResQueries);
console.log('Admin and Researcher mobile overrides appended to CSS.');
