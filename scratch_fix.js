const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
code = code.replace(/"confidence": 85/g, '"confidence": "[0-100]"');
fs.writeFileSync('server.js', code);
console.log('Fixed confidence bias!');
