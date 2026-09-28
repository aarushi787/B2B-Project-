import nodemailer from 'nodemailer';
import { logger } from './logger.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  auth: {
    user: process.env.SMTP_USER || 'apikey',
    pass: process.env.SMTP_PASS || ''
  }
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    if (!process.env.SMTP_PASS) {
      logger.info(`[Simulated Email] To: ${to} | Subject: ${subject}`);
      return;
    }
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"B2B For Corporates" <noreply@b2bforcorporates.com>',
      to,
      subject,
      html
    });
    logger.info(`Email sent to ${to}`);
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
  }
};
