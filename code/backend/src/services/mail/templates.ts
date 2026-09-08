import { OTP_TTL_MINUTES } from '@campuslink/shared';

/**
 * The verification email.
 *
 * Written as inline-styled table HTML rather than modern CSS on purpose: Gmail strips <style>
 * blocks in some clients, Outlook renders through Word's engine, and flexbox is unreliable in
 * both. This is ugly by web standards and correct by email ones.
 *
 * A plain-text alternative always ships alongside it — some clients render nothing else, and
 * a mail with no text part scores worse with spam filters.
 */
export function verificationEmail(name: string, code: string) {
  const firstName = name.split(' ')[0] ?? name;

  const text = [
    `Hi ${firstName},`,
    '',
    `Your CampusLink verification code is ${code}.`,
    `It expires in ${OTP_TTL_MINUTES} minutes.`,
    '',
    "If you didn't request this, you can safely ignore this email.",
    '',
    '— CampusLink, Thapar Institute of Engineering and Technology',
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#c85b44,#8f3b2b);padding:28px 32px;">
                <p style="margin:0;color:#ffffff;font-size:18px;font-weight:600;letter-spacing:0.28em;">CAMPUSLINK</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 8px;font-size:16px;color:#0f172a;">Hi ${escapeHtml(firstName)},</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
                  Use this code to verify your college email and finish setting up your account.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="background-color:#fdf4f1;border:1px solid #f4c7b9;border-radius:12px;padding:20px;">
                      <p style="margin:0;font-size:34px;font-weight:700;letter-spacing:0.34em;color:#8f3b2b;font-family:'SF Mono',Menlo,Consolas,monospace;">${code}</p>
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 0;font-size:14px;color:#64748b;">
                  This code expires in <strong style="color:#0f172a;">${OTP_TTL_MINUTES} minutes</strong>.
                </p>
                <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#94a3b8;">
                  If you didn't request this, you can safely ignore this email — nobody can access
                  your account without the code.
                </p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e2e8f0;padding:20px 32px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  CampusLink · Thapar Institute of Engineering and Technology
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { text, html };
}

/** The name comes from user input, so it is escaped before being interpolated into HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
