const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, 'js');
const filesToPatch = ['adminModule.js', 'app.js', 'authManager.js', 'toothDetector.js'];

filesToPatch.forEach(file => {
  const filePath = path.join(jsDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace fetch('/api/ to fetch('http://192.168.31.10:3000/api/
    // and fetch(`/api/ to fetch(`http://192.168.31.10:3000/api/
    // Be careful not to replace it if it's already an absolute URL.
    content = content.replace(/fetch\('\/api\//g, "fetch('http://192.168.31.10:3000/api/");
    content = content.replace(/fetch\(`\/api\//g, "fetch(`http://192.168.31.10:3000/api/");
    
    // specifically for toothDetector let apiUrl = '/api/analyze';
    content = content.replace(/let apiUrl = '\/api\/analyze'/g, "let apiUrl = 'http://192.168.31.10:3000/api/analyze'");
    content = content.replace(/apiUrl = '\/api\/analyze'/g, "apiUrl = 'http://192.168.31.10:3000/api/analyze'");
    
    fs.writeFileSync(filePath, content);
    console.log(`Patched ${file}`);
  }
});
