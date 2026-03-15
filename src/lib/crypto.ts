/**
 * Hashes a security PIN using SHA-256 with a salt.
 * Uses the Web Crypto API (available in all modern browsers).
 */

const SALT = 'mekids-kc-pin-salt-v1';

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(enteredPin: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(enteredPin);
  return hash === storedHash;
}
