import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import type { MailMessage, MailSender } from './MailSender.js';

/**
 * Real mail delivery over SMTP.
 *
 * Deliberately generic rather than tied to one provider's SDK: the same class works with Gmail,
 * Outlook, Brevo, SendGrid and Mailtrap, and switching between them is four environment
 * variables. For a project that has to survive a provider's free tier changing under it, that
 * portability is worth more than any one SDK's conveniences.
 */
export class SmtpMailSender implements MailSender {
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      // Without these a dead host leaves the signup request hanging until the client gives up.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  /**
   * Confirms the credentials work, at boot rather than at first signup.
   *
   * A wrong app password otherwise shows up as a student who never receives a code, with nothing
   * in the logs until someone tries to sign up — the failure should be visible when the server
   * starts, not during a demo.
   */
  async verify(): Promise<void> {
    await this.transporter.verify();
  }

  async send(message: MailMessage): Promise<void> {
    const info = await this.transporter.sendMail({
      from: env.MAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    console.log(`[mail] sent to ${message.to} (id ${info.messageId})`);
  }
}
