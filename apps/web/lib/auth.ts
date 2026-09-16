import type { User } from './types';

type Listener = () => void;
type AuthResponse = { accessToken: string; user: User };
let accessToken: string | null = null;
let user: User | null = null;
let refreshPromise: Promise<boolean> | null = null;
const listeners = new Set<Listener>();
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

function notify() { listeners.forEach((l) => l()); }
export function getAccessToken() { return accessToken; }
export function getUser() { return user; }
export function subscribeAuth(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function setSession(token: string | null, nextUser: User | null) { accessToken = token; user = nextUser; notify(); }

export async function login(email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const data = await parseResponse<AuthResponse>(res);
  setSession(data.accessToken, data.user);
  return data.user as User;
}

export async function signup(name: string, email: string, password: string) {
  const res = await fetch(`${API}/auth/signup`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
  const data = await parseResponse<AuthResponse>(res);
  setSession(data.accessToken, data.user);
  return data.user as User;
}

export async function refreshSession() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!res.ok) { setSession(null, null); return false; }
      const data = await res.json() as AuthResponse;
      setSession(data.accessToken, data.user);
      return true;
    } catch { setSession(null, null); return false; }
    finally { refreshPromise = null; }
  })();
  return refreshPromise;
}

export async function logout() {
  try { await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }); } finally { setSession(null, null); }
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}, canRetry = true): Promise<T> {
  if (!accessToken && canRetry) await refreshSession();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  let res = await fetch(`${API}${path}`, { ...init, headers, credentials: 'include' });
  if (res.status === 401 && canRetry) {
    const refreshed = await refreshSession();
    if (refreshed) return apiFetch<T>(path, init, false);
  }
  return parseResponse<T>(res);
}

async function parseResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const messageValue = typeof data === 'object' && data !== null && 'message' in data ? (data as { message?: unknown }).message : undefined;
    const message = Array.isArray(messageValue) ? messageValue.join(', ') : typeof messageValue === 'string' ? messageValue : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}
