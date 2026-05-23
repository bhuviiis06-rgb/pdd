const fs = require('fs');
let css = fs.readFileSync('css/style.css', 'utf8');

// Remove the specific hiding for sectionUpload only
css = css.replace(/#sectionUpload\s*\.patient-form-card\s*\{\s*display:\s*none\s*!important;\s*\}/g, '');

fs.writeFileSync('css/style.css', css);
console.log('Reverted CSS hiding of patient form card in sectionUpload.');
