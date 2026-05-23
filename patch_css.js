const fs = require('fs');

const mediaQueries = `

/* ================================================
   MOBILE RESPONSIVE OVERRIDES
   ================================================ */
@media screen and (max-width: 768px) {
  /* 1. App Container & Typography */
  .app-container {
    padding: 80px 16px 32px;
  }
  .section-title {
    font-size: 24px;
  }
  .hero-title {
    font-size: clamp(32px, 8vw, 42px);
  }
  .hero-subtitle {
    font-size: 15px;
  }

  /* 2. Navbar & Navigation */
  .nav-inner {
    padding: 0 16px;
  }
  .brand-name {
    font-size: 16px;
  }
  .brand-tagline {
    display: none; /* Hide on very small screens to save space */
  }
  .nav-actions {
    gap: 6px;
  }
  .nav-btn {
    padding: 8px 12px;
    font-size: 13px;
  }

  /* 3. Core Layouts (Grid & Flexbox) */
  /* Hero Section */
  .hero-section {
    flex-direction: column;
    text-align: center;
    gap: 32px;
  }
  .hero-stats {
    justify-content: center;
    gap: 16px;
  }
  .hero-actions {
    justify-content: center;
  }

  /* Doctor Dashboard */
  .dash-stats {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .dash-actions-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .dash-recent-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  /* Patients Grid */
  .patients-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  /* Upload / Add Patient Screens */
  .upload-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  /* Forms */
  .form-row {
    grid-template-columns: 1fr;
  }

  /* Results Screen */
  .results-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .results-sidebar {
    order: 2; /* Ensure sidebar is below the images */
  }
  .results-content {
    order: 1;
  }
  
  /* Viewer Header */
  .viewer-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .viewer-toggles {
    width: 100%;
    justify-content: space-between;
  }

  /* Admin Module Layout */
  .admin-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  /* Modals */
  .modal-content {
    padding: 24px 20px;
    width: calc(100% - 32px);
    margin: 16px;
  }

  /* 4. Interaction Targets */
  .btn-primary, .btn-ghost, .dash-action-btn {
    min-height: 44px; /* Better touch targets */
  }
  .form-group input, .form-group select {
    min-height: 44px;
  }
}

/* Very small screens */
@media screen and (max-width: 480px) {
  .hero-stats {
    flex-direction: column;
    gap: 24px;
  }
  .stat-divider {
    display: none;
  }
  .nav-btn-primary span {
    display: none; /* Hide text, only show icon on very small screens for login/logout */
  }
}
`;

if (!fs.readFileSync('css/style.css', 'utf8').includes('MOBILE RESPONSIVE OVERRIDES')) {
  fs.appendFileSync('css/style.css', mediaQueries);
}
