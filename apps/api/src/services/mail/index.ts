import { env } from '../../config/env.js';
import { ConsoleMailSender } from './ConsoleMailSender.js';
import type { MailSender } from './MailSender.js';

export type { MailMessage, MailSender } from './MailSender.js';

function createMailSender(): MailSender {
  switch (env.MAIL_TRANSPORT) {
    case 'console':
      return new ConsoleMailSender();
    default:
      // Unreachable while MAIL_TRANSPORT is a single-value enum, but this is the spot a real
      // provider gets added, and an exhaustive switch will fail the typecheck if one is missed.
      throw new Error(`Unsupported MAIL_TRANSPORT: ${env.MAIL_TRANSPORT}`);
  }
}

export const mailSender: MailSender = createMailSender();
