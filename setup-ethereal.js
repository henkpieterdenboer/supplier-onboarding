const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function setupEthereal() {
  // Create test account
  const testAccount = await nodemailer.createTestAccount();

  console.log('Ethereal test account aangemaakt!');
  console.log('================================');
  console.log('Email:', testAccount.user);
  console.log('Wachtwoord:', testAccount.pass);
  console.log('');
  console.log('SMTP Host:', testAccount.smtp.host);
  console.log('SMTP Port:', testAccount.smtp.port);
  console.log('');
  console.log('Bekijk verstuurde emails op:');
  console.log('https://ethereal.email/login');
  console.log('');

  // Update .env file
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Replace SMTP settings
  envContent = envContent.replace(/SMTP_HOST=.*/, `SMTP_HOST="${testAccount.smtp.host}"`);
  envContent = envContent.replace(/SMTP_PORT=.*/, `SMTP_PORT="${testAccount.smtp.port}"`);
  envContent = envContent.replace(/SMTP_USER=.*/, `SMTP_USER="${testAccount.user}"`);
  envContent = envContent.replace(/SMTP_PASS=.*/, `SMTP_PASS="${testAccount.pass}"`);

  fs.writeFileSync(envPath, envContent);

  console.log('.env bestand bijgewerkt!');
  console.log('');
  console.log('Herstart de development server om de wijzigingen toe te passen.');
}

setupEthereal().catch(console.error);
