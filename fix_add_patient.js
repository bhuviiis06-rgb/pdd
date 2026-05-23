const fs = require('fs');
let css = fs.readFileSync('css/style.css', 'utf8');
css = css.replace(/#sectionAddPatient\s*\{\s*display:\s*none\s*!important;\s*\}/g, '');
fs.writeFileSync('css/style.css', css);
console.log('Fixed CSS to show Add Patient screen.');
