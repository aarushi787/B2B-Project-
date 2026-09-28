import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

let transporter: nodemailer.Transporter;

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
  const t = await initTransporter();
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0F9D9D; margin-bottom: 20px;">${subject}</h2>
      <p style="color: #334155; line-height: 1.5; margin-bottom: 24px;">${message}</p>
      ${ctaLink ? `<a href="${ctaLink}" style="display: inline-block; padding: 12px 24px; background-color: #0F9D9D; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">${ctaText || 'View Details'}</a>` : ''}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px;" />
      <p style="color: #94a3b8; font-size: 12px;">This is an automated notification from the B2B Nexus Platform.</p>
    </div>
  `;

  const mailOptions = {
    from: '"B2B Nexus" <notifications@b2bforcorporates.com>',
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
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?mode=reset-password&token=${resetToken}`;
  await sendNotificationEmail(
    to, 
    "Password Reset Request", 
    "You requested a password reset. Click the button below to reset your password.", 
    resetLink, 
    "Reset Password"
  );
};
