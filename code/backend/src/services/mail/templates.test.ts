import { describe, expect, it } from 'vitest';
import { OTP_TTL_MINUTES } from '@campuslink/shared';
import { verificationEmail } from './templates.js';

describe('verification email', () => {
  it('includes the code in both the text and HTML parts', () => {
    const { text, html } = verificationEmail('Ashish Bajaj', '482913');
    expect(text).toContain('482913');
    expect(html).toContain('482913');
  });

  it('always ships a plain-text alternative', () => {
    // Some clients render nothing else, and a mail with no text part scores worse with filters.
    const { text } = verificationEmail('Ashish Bajaj', '482913');
    expect(text.length).toBeGreaterThan(50);
    expect(text).toContain(String(OTP_TTL_MINUTES));
  });

  it('greets by first name only', () => {
    expect(verificationEmail('Ashish Bajaj', '000000').text).toContain('Hi Ashish,');
  });

  it('escapes the name, which is user input, before putting it in HTML', () => {
    // Without escaping, a display name could inject markup into every email we send.
    const { html } = verificationEmail('<script>alert(1)</script>', '000000');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
