import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'apikey', // default for SendGrid
    pass: process.env.SMTP_PASS || '',
  },
});

export const sendPasswordResetEmail = async (to: string, resetToken: string) => {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?mode=reset-password&token=${resetToken}`;
  
  const mailOptions = {
    from: '"B2B For Corporates Support" <support@b2bforcorporates.com>',
    to,
    subject: 'Password Reset Request',
    text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the button below to reset your password.</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>Or copy this link: ${resetLink}</p>
      </div>
    `,
  };

  try {
    if (!process.env.SMTP_PASS) {
      logger.warn(`Mock sending email to ${to} (SMTP_PASS not set). Link: ${resetLink}`);
      return;
    }
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${to}: ${info.messageId}`);
  } catch (error) {
    logger.error('Error sending password reset email', { error });
    throw new Error('Failed to send email');
  }
};
