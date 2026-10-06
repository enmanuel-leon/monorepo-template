import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

let transporter: Transporter | null = null;

if (env.EMAIL_ENABLED && env.SMTP_HOST) {
  const isSecure = env.SMTP_PORT === 465;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: isSecure,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

/**
 * Sends transactional email if email provider is enabled.
 *
 * @param to - Recipient email.
 * @param subject - Email subject line.
 * @param html - Rendered HTML content.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (transporter) {
    try {
      logger.info({ to, subject }, 'Sending transactional email via SMTP...');
      const info = await transporter.sendMail({
        from: env.SMTP_FROM || 'App Template <onboarding@resend.dev>',
        to,
        subject,
        html,
      });
      logger.info({ to, messageId: info.messageId }, 'Email sent successfully via SMTP');
    } catch (err) {
      logger.error({ err, to, subject }, 'Failed to send email via SMTP transporter');
    }
  } else {
    logger.info({ to, subject }, 'Email disabled or mock mode. Skipping actual send.');
  }
}
