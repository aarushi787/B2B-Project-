// Usage: npm run email:test -- you@example.com
// Checks the SMTP login, then sends one real message, so you know email works before a user needs it.
import 'dotenv/config';
import { sendEmail, verifyMailer, emailEnabled } from '../services/email.js';

const to = process.argv[2];
if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.error('Give the address to send to:  npm run email:test -- you@example.com');
  process.exit(1);
}

console.log(`SMTP host: ${process.env.SMTP_HOST || '(default smtp.sendgrid.net)'}  user: ${process.env.SMTP_USER || '(default apikey)'}  password set: ${process.env.SMTP_PASS ? 'yes' : 'NO'}`);
if (!emailEnabled()) {
  console.error('SMTP_PASS is empty and NODE_ENV=production, so nothing can be sent. Fill SMTP_* in backend/.env.');
  process.exit(1);
}

async function main() {
  const login = await verifyMailer();
  if (!login.ok) { console.error(`SMTP login failed: ${login.error}`); process.exit(1); }
  console.log('SMTP login OK.');

  const r = await sendEmail(to, 'B2BForCorporates email test', '<p>If you can read this, B2BForCorporates can send email.</p>');
  if (!r.sent) { console.error(`Send failed: ${r.error}`); process.exit(1); }
  console.log(`Sent to ${to}. Message ID: ${r.messageId}${r.previewUrl ? `\nOpen this to see it (test inbox): ${r.previewUrl}` : ''}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
