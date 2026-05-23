const os = require('os');
const QRCode = require('qrcode');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    if (name.toLowerCase().includes('vboxnet') || name.toLowerCase().includes('wsl')) continue;
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

const ip = getLocalIp();
const port = process.env.PORT || 3000;
const url = `http://${ip}:${port}`;

QRCode.toDataURL(url, { width: 400 }, (err, dataUrl) => {
  if (err) throw err;
  console.log('URL=' + url);
  console.log(dataUrl);
});
