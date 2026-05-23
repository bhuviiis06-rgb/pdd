const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Patch login
const loginRegex = /const user = await User\.findOne\({ username, password }\);\s*if \(!user\) return res\.status\(401\)\.json\({ error: 'Invalid credentials' }\);/;
const loginReplacement = `const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status === 'suspended') {
      return res.status(403).json({ error: \`Account suspended. Reason: \${user.suspendReason || 'No reason provided'}\` });
    }`;
code = code.replace(loginRegex, loginReplacement);

// Patch suspend
const suspendRegex = /\/\/ Toggle status\s*user\.status = user\.status === 'suspended' \? 'active' : 'suspended';/;
const suspendReplacement = `// Toggle status
    if (user.status === 'suspended') {
      user.status = 'active';
      user.suspendReason = '';
    } else {
      user.status = 'suspended';
      user.suspendReason = req.body.reason || 'Admin suspension';
    }`;
code = code.replace(suspendRegex, suspendReplacement);

fs.writeFileSync('server.js', code);
console.log('server.js patched for suspend!');
