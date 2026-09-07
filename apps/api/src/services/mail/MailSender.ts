/**
 * The seam between the application and however mail actually gets delivered.
 *
 * `console` prints to the terminal for development; `smtp` sends real mail. Nothing in the auth
 * service knows or cares which is in use — that is the whole point of the interface, and it is
 * why turning on real delivery was a config change rather than a rewrite.
 */
export interface MailMessage {
  to: string;
  subject: string;
  /** Plain-text body. Always required — some clients render nothing else. */
  text: string;
  /** Optional HTML body. Clients that support it prefer this over `text`. */
  html?: string;
}

export interface MailSender {
  send(message: MailMessage): Promise<void>;
  /** Checks the transport can actually deliver. Called once at boot. */
  verify?(): Promise<void>;
}
