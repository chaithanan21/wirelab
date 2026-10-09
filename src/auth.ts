const SALT = '29d89a8602460c6f2b05150a04c31193';
const HASH = '9e4014a4bb039a0a9cd9daaed9d209d06bb00bf9adf6a94308b5e236cb47283b';
const ITER = 210000;
const SS_KEY = 'wirelab.unlock';

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string) => new Uint8Array(s.match(/../g)!.map((x) => parseInt(x, 16)));

export async function verifyLogin(user: string, pw: string): Promise<boolean> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`${user.trim()}\n${pw}`), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(SALT), iterations: ITER }, key, 256);
  const ok = hex(bits) === HASH;
  if (ok) sessionStorage.setItem(SS_KEY, HASH);
  return ok;
}

export const isUnlocked = () => sessionStorage.getItem(SS_KEY) === HASH;

export const LOCKED_GROUPS = ['plant', 'full'];
