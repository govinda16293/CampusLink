import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('Correct horse battery staple', hash)).resolves.toBe(false);
  });

  it('salts each hash, so identical passwords do not collide', async () => {
    // Two users with the same password must not share a hash, or one leaked hash exposes both.
    const [a, b] = await Promise.all([
      hashPassword('same-password'),
      hashPassword('same-password'),
    ]);
    expect(a).not.toBe(b);
    await expect(verifyPassword('same-password', a)).resolves.toBe(true);
    await expect(verifyPassword('same-password', b)).resolves.toBe(true);
  });

  it('embeds its parameters so they can be raised later without locking anyone out', async () => {
    const hash = await hashPassword('whatever');
    expect(hash.split('$').slice(0, 4)).toEqual(['scrypt', '32768', '8', '1']);
  });

  it('returns false rather than throwing on a malformed stored hash', async () => {
    // A corrupted row must deny access, not 500 — a 500 would confirm the account exists.
    for (const bad of ['', 'not-a-hash', 'scrypt$1$2$3', 'bcrypt$32768$8$1$aaaa$bbbb']) {
      await expect(verifyPassword('whatever', bad)).resolves.toBe(false);
    }
  });
});
