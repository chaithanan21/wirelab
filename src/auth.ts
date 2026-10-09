const AUTH_URL = 'https://projectx.boonrawd.co.th/dataspcx/api/authenwirelab';
const SS_KEY = 'wirelab.unlock';

export type LoginResult = 'ok' | 'denied' | 'error';

export async function verifyLogin(user: string, pw: string): Promise<LoginResult> {
  try {
    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: user.trim(), pw }),
    });
    if (res.status === 200) {
      sessionStorage.setItem(SS_KEY, '1');
      return 'ok';
    }
    return res.status === 401 ? 'denied' : 'error';
  } catch {
    return 'error';
  }
}

export const isUnlocked = () => sessionStorage.getItem(SS_KEY) === '1';

export const LOCKED_GROUPS = ['plant', 'full'];
