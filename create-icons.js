const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#4361ee"/>
  <text x="256" y="310" font-size="280" text-anchor="middle" fill="white" font-family="Arial">🎓</text>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), svg);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), svg);
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svg);

console.log('Icons created at', iconsDir);
