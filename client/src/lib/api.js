// client/src/lib/api.js
export const API_BASE =
  (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.replace(/\/+$/, '')) || '';

async function http(path, opts) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
    credentials: 'omit',
    method: opts?.method || 'POST',
    body: opts?.body ? JSON.stringify(opts.body) : null,
  });
  const text = await res.text();
  try {
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  } catch (e) {
    if (text?.startsWith('<!DOCTYPE')) {
      throw new Error(
        'API_URL misconfigured: received HTML from server (check VITE_API_URL on Vercel)'
      );
    }
    throw e;
  }
}

export const post = (path, body) => http(path, { method: 'POST', body });
export const get = (path) => http(path, { method: 'GET' });
