import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';
import { frontendBaseUrl } from '../utils/origins.js';

let transporter: any;

const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** True when real mail can be sent: SMTP configured, or a non-production environment (Ethereal test inbox). */
export const emailEnabled = () => Boolean(process.env.SMTP_PASS) || process.env.NODE_ENV !== 'production';

async function initTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'apikey',
        pass: process.env.SMTP_PASS || '',
      },
    });
  } else {
    // Generate test SMTP service account from ethereal.email
    logger.info("No SMTP_PASS provided. Creating Ethereal Mail test account...");
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
    logger.info(`Test Email Account Created. User: ${testAccount.user}`);
  }
  return transporter;
}

export const sendNotificationEmail = async (to: string, subject: string, message: string, ctaLink?: string, ctaText?: string) => {
  if (!emailEnabled()) {
    logger.warn('email_skipped_no_smtp', { hint: 'Set SMTP_PASS (and SMTP_HOST/SMTP_USER/EMAIL_FROM) to send email in production.' });
    return;
  }
  const t = await initTransporter();
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message);
  const safeLink = ctaLink && /^https?:\/\//.test(ctaLink) ? escapeHtml(ctaLink) : '';
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #6921A5; margin-bottom: 20px;">${safeSubject}</h2>
      <p style="color: #334155; line-height: 1.5; margin-bottom: 24px;">${safeMessage}</p>
      ${safeLink ? `<a href="${safeLink}" style="display: inline-block; padding: 12px 24px; background-color: #6921A5; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">${escapeHtml(ctaText || 'View Details')}</a>` : ''}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px;" />
      <p style="color: #94a3b8; font-size: 12px;">This is an automated notification from B2BForCorporates.</p>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"B2BForCorporates" <notifications@b2bforcorporates.com>',
    to,
    subject,
    text: message + (ctaLink ? `\n\nLink: ${ctaLink}` : ''),
    html: htmlContent,
  };

  try {
    const info = await t.sendMail(mailOptions);
    logger.info(`Email sent to ${to}. Message ID: ${info.messageId}`);
    if (!process.env.SMTP_PASS) {
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (error) {
    logger.error('Error sending notification email', { error });
  }
};

export const sendPasswordResetEmail = async (to: string, resetToken: string) => {
  const resetLink = `${frontendBaseUrl()}/auth?mode=reset-password&token=${resetToken}`;
  await sendNotificationEmail(
    to, 
    "Password Reset Request", 
    "You requested a password reset. Click the button below to reset your password.", 
    resetLink, 
    "Reset Password"
  );
};
