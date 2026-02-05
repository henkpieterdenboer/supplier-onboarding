const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function makeTransparent() {
  const inputPath = path.join(__dirname, 'public', 'logo.png');
  const outputPath = path.join(__dirname, 'public', 'logo-transparent.png');

  // Read the image and get raw pixel data
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  // Get raw pixel data with alpha channel
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Replace white/near-white pixels with transparent
  const threshold = 250; // Pixels with R, G, B all above this become transparent

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // If pixel is white or near-white, make it transparent
    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0; // Set alpha to 0 (transparent)
    }
  }

  // Write the modified image
  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .png()
    .toFile(outputPath);

  console.log('Created transparent logo at:', outputPath);

  // Also overwrite the original
  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .png()
    .toFile(inputPath);

  console.log('Updated original logo at:', inputPath);

  // Now regenerate the base64 version
  const logoBuffer = fs.readFileSync(inputPath);
  const base64 = logoBuffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64}`;

  const base64FilePath = path.join(__dirname, 'src', 'lib', 'logo-base64.ts');
  fs.writeFileSync(base64FilePath, `export const LOGO_BASE64 = '${dataUri}'\n`);

  console.log('Updated base64 logo at:', base64FilePath);
}

makeTransparent().catch(console.error);
