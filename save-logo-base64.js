const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, 'public', 'logo.png');
const logoBuffer = fs.readFileSync(logoPath);
const base64 = logoBuffer.toString('base64');
const dataUri = `data:image/png;base64,${base64}`;

// Save to a TypeScript file
const outputPath = path.join(__dirname, 'src', 'lib', 'logo-base64.ts');
const content = `// Auto-generated logo base64
export const LOGO_BASE64 = "${dataUri}";
`;

fs.writeFileSync(outputPath, content);
console.log('Logo base64 saved to src/lib/logo-base64.ts');
