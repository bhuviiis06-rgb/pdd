const fs = require('fs');
const files = [
  'js/adminModule.js',
  'js/app.js',
  'js/authManager.js',
  'js/toothDetector.js'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/http:\/\/localhost:3000/g, '');
    fs.writeFileSync(file, content);
    console.log('Patched ' + file);
  }
});
