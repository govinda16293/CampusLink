import { env } from '../../config/env.js';
import { ConsoleMailSender } from './ConsoleMailSender.js';
import { SmtpMailSender } from './SmtpMailSender.js';
import type { MailSender } from './MailSender.js';

export type { MailMessage, MailSender } from './MailSender.js';

function createMailSender(): MailSender {
  switch (env.MAIL_TRANSPORT) {
    case 'smtp':
      return new SmtpMailSender();
    case 'console':
      return new ConsoleMailSender();
    default: {
      // An exhaustive switch: adding a transport to the enum without handling it here fails
      // the typecheck rather than falling through at runtime.
      const unreachable: never = env.MAIL_TRANSPORT;
      throw new Error(`Unsupported MAIL_TRANSPORT: ${unreachable}`);
    }
  }
}

export const mailSender: MailSender = createMailSender();

/**
 * Checks the transport at boot and reports the result.
 *
 * Never throws: a mail server that is briefly unreachable should not stop the API from serving
 * the feed. It logs loudly instead, so the problem is visible before anyone tries to sign up.
 */
export async function verifyMailTransport(): Promise<void> {
  if (!mailSender.verify) {
    console.log(`[mail] transport: ${env.MAIL_TRANSPORT} (passcodes print to this terminal)`);
    return;
  }

  try {
    await mailSender.verify();
    console.log(`[mail] transport: smtp via ${env.SMTP_HOST} as ${env.SMTP_USER} — connection OK`);
  } catch (error) {
    console.error(
      `[mail] SMTP verification FAILED for ${env.SMTP_USER} at ${env.SMTP_HOST}:${env.SMTP_PORT}.`,
      '\n       Verification emails will not be delivered until this is fixed.',
      '\n      ',
      error instanceof Error ? error.message : error,
    );
  }
}
