import { env } from '../../config/env.js';
import type { MailMessage, MailSender } from './MailSender.js';

/**
 * Development transport: prints the message to the terminal instead of sending it.
 *
 * Signup therefore works with no mail credentials at all — read the passcode out of the
 * `npm run dev` output and paste it into the form. The box drawing is deliberate: the API log is
 * noisy with request lines, and a passcode you have to hunt for wastes time on every test signup.
 */
export class ConsoleMailSender implements MailSender {
  async send(message: MailMessage): Promise<void> {
    const line = '─'.repeat(64);
    console.log(
      [
        `\n┌${line}┐`,
        `│ EMAIL (console transport — not actually sent)`,
        `│ From:    ${env.MAIL_FROM}`,
        `│ To:      ${message.to}`,
        `│ Subject: ${message.subject}`,
        `├${line}┤`,
        ...message.text.split('\n').map((l) => `│ ${l}`),
        `└${line}┘\n`,
      ].join('\n'),
    );
  }
}
