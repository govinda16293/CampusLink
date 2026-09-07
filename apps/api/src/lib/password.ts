import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Promise wrapper around `crypto.scrypt`.
 *
 * `util.promisify` drops the overload that accepts an options object, and these parameters have
 * to be passed explicitly, so the callback form is wrapped by hand.
 */
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/**
 * Password hashing built on Node's own scrypt.
 *
 * scrypt is memory-hard and ships in the standard library, which matters here: argon2 and bcrypt
 * both need a native build step, and npm now blocks install scripts by default — a dependency
 * the team cannot install on a fresh clone is worse than a slightly older KDF. scrypt with these
 * parameters is an accepted choice under the OWASP password storage guidance.
 *
 * Stored format: `scrypt$N$r$p$<salt-b64>$<hash-b64>`. The parameters travel with the hash, so
 * they can be raised later without invalidating existing passwords.
 */
const N = 32768; // CPU/memory cost — 2^15
const R = 8; // block size
const P = 1; // parallelisation
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

// scrypt needs roughly 128 * N * r bytes; Node's default maxmem (32 MB) is just under what these
// parameters require, so it is raised explicitly rather than left to fail at runtime.
const MAX_MEM = 128 * N * R * 2;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password, salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: MAX_MEM,
  });

  return ['scrypt', N, R, P, salt.toString('base64'), derived.toString('base64')].join('$');
}

/**
 * Constant-time verification.
 *
 * Returns false rather than throwing on a malformed stored hash, so a corrupted row denies
 * access instead of returning a 500 that would tell an attacker the account exists.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  const salt = Buffer.from(saltB64!, 'base64');
  const expected = Buffer.from(hashB64!, 'base64');
  if (expected.length === 0) return false;

  try {
    const actual = await scryptAsync(password, salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: 128 * n * r * 2,
    });

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
