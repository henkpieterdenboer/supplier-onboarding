const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, 'public', 'logo.png');
const logoBuffer = fs.readFileSync(logoPath);
const base64 = logoBuffer.toString('base64');
const dataUri = `data:image/png;base64,${base64}`;

console.log('Logo Base64 Data URI:');
console.log(dataUri);
