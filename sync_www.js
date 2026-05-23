const fs = require('fs');
const path = require('path');

const wwwDir = path.join(__dirname, 'www');

if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir);
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'www' && entry.name !== '.git' && entry.name !== 'android') {
         // for root level, we only want specific dirs anyway.
         // Let's just copy js, css, images, mockup directly to avoid copying backend stuff.
      }
    }
  }
}

// Copy specifically: index.html, css, js, images, mockup
const dirsToCopy = ['css', 'js', 'images', 'mockup'];
const filesToCopy = ['index.html'];

dirsToCopy.forEach(dir => {
  if (fs.existsSync(dir)) {
    const destDir = path.join(wwwDir, dir);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.cpSync(dir, destDir, { recursive: true });
  }
});

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(wwwDir, file));
  }
});

console.log('Web assets copied to www folder successfully!');
