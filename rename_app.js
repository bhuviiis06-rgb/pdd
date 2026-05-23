const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replacements
html = html.replace('<title>DentAI - Intelligent Clinical & Research Platform</title>', '<title>DMFT Analysis</title>');
html = html.replace('<span class="brand-name">DentAI Platform</span>', '<span class="brand-name">DMFT Analysis</span>');
html = html.replace('<h2>Welcome to DentAI</h2>', '<h2>Welcome to DMFT Analysis</h2>');
html = html.replace('<strong>Simulation Mode Active:</strong> The local DentAI server could not be reached.', '<strong>Simulation Mode Active:</strong> The local DMFT Analysis server could not be reached.');
html = html.replace('The local DentAI server (<strong>http://localhost:3000</strong>) could not be reached.', 'The local DMFT Analysis server (<strong>http://localhost:3000</strong>) could not be reached.');

fs.writeFileSync('index.html', html);
console.log('App renamed to DMFT Analysis in index.html');
