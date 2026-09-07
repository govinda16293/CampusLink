/**
 * The seam between the application and however mail actually gets delivered.
 *
 * Development prints to the terminal; the demo will swap in a real provider (Resend, or SMTP via
 * Nodemailer) by adding one class here and one value to MAIL_TRANSPORT. Nothing in the auth
 * service knows or cares which is in use — that is the whole point of the interface.
 */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface MailSender {
  send(message: MailMessage): Promise<void>;
}
