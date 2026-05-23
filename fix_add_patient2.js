const fs = require('fs');
let css = fs.readFileSync('css/style.css', 'utf8');

// Remove the generic class hiding
css = css.replace(/\.patient-form-card\s*\{\s*display:\s*none\s*!important;\s*\}/g, '');

// Add the specific hiding for sectionUpload only
css += `\n#sectionUpload .patient-form-card {\n  display: none !important;\n}\n`;

fs.writeFileSync('css/style.css', css);
console.log('Fixed CSS to properly show Add Patient screen but hide it in Upload screen.');
