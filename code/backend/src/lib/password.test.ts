import { describe, expect, it } from 'vitest';
import { randomBytes, scrypt } from 'node:crypto';
import {
  PRODUCTION_SCRYPT_COST,
  TEST_SCRYPT_COST,
  hashPassword,
  scryptCostFor,
  verifyPassword,
} from './password.js';

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
    const parts = (await hashPassword('whatever')).split('$');
    expect(parts).toHaveLength(6);
    // The cost itself is asserted below, against the environment, rather than hardcoded here —
    // the suite deliberately runs at a lower one, and this test is about the format.
    expect([parts[0], parts[2], parts[3]]).toEqual(['scrypt', '8', '1']);
    expect(Number(parts[1])).toBeGreaterThan(0);
  });

  it('returns false rather than throwing on a malformed stored hash', async () => {
    // A corrupted row must deny access, not 500 — a 500 would confirm the account exists.
    for (const bad of ['', 'not-a-hash', 'scrypt$1$2$3', 'bcrypt$32768$8$1$aaaa$bbbb']) {
      await expect(verifyPassword('whatever', bad)).resolves.toBe(false);
    }
  });
});

describe('scryptCostFor — the work factor must not be weakened outside tests', () => {
  it('uses the full cost everywhere that is not the test suite', () => {
    for (const nodeEnv of ['production', 'development', 'staging', undefined]) {
      expect(scryptCostFor(nodeEnv)).toBe(PRODUCTION_SCRYPT_COST);
    }
  });

  it('only lowers the cost for an exact "test"', () => {
    expect(scryptCostFor('test')).toBe(TEST_SCRYPT_COST);
    // Not a prefix match, not a substring: "testing" or "fastest" must get the real cost.
    expect(scryptCostFor('testing')).toBe(PRODUCTION_SCRYPT_COST);
  });

  it('keeps the production cost at the OWASP recommendation', () => {
    expect(PRODUCTION_SCRYPT_COST).toBe(32768);
  });

  it('records the cost in force inside the hash it writes', async () => {
    const [scheme, cost] = (await hashPassword('correct-horse-1')).split('$');
    expect(scheme).toBe('scrypt');
    expect(Number(cost)).toBe(scryptCostFor(process.env.NODE_ENV));
  });

  it('verifies a hash written at a cost this build does not use', async () => {
    // This is the whole reason lowering the cost for tests is safe, so it is proved rather than
    // asserted in a comment: a hash is built here at a third cost, using neither constant, and
    // must still verify. Passwords hashed before a cost change keep working after it.
    const otherCost = 2048;
    expect(otherCost).not.toBe(scryptCostFor(process.env.NODE_ENV));

    const salt = randomBytes(16);
    const derived: Buffer = await new Promise((resolve, reject) =>
      scrypt(
        'correct-horse-1',
        salt,
        64,
        { N: otherCost, r: 8, p: 1, maxmem: 128 * otherCost * 8 * 2 },
        (error, key) => (error ? reject(error) : resolve(key)),
      ),
    );
    const stored = [
      'scrypt',
      otherCost,
      8,
      1,
      salt.toString('base64'),
      derived.toString('base64'),
    ].join('$');

    expect(await verifyPassword('correct-horse-1', stored)).toBe(true);
    expect(await verifyPassword('the-wrong-password', stored)).toBe(false);
  });
});
