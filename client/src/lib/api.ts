const TOKEN_KEY = 'sklToken';
const REMEMBER_KEY = 'sklRemember';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';
}

export function storeToken(token: string, rememberMe: boolean) {
  clearStoredToken();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REMEMBER_KEY, String(rememberMe));
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

export function getStoredRememberMe() {
  return localStorage.getItem(REMEMBER_KEY) === 'true';
}

export async function readApiError(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return typeof data?.error === 'string' ? data.error : fallback;
  } catch {
    return fallback;
  }
}

export function api(url: string, opts: RequestInit = {}) {
  const headers = new Headers(opts.headers || {});
  if (!(opts.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...opts, headers });
}
