// Tiny API helper. Talks to the same Express backend (/api/...).
const TOKEN_KEY = 'dbl_admin_token';

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

export async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token && opts.auth !== false) headers.Authorization = 'Bearer ' + token;

  const res = await fetch('/api' + path, { ...opts, headers });
  let body = {};
  try { body = await res.json(); } catch { /* empty */ }
  if (res.status === 401 && opts.on401) opts.on401();
  if (!res.ok) throw new Error(body.error || 'Request failed.');
  return body;
}

export function rupees(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
