const API = process.env.API_URL ?? 'http://localhost:4000/api';
let cookie = '';
let accessToken = '';

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (cookie) headers.set('Cookie', cookie);
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${path} -> ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

console.log('1/5 Health');
console.log(await request('/health'));

console.log('2/5 Login seed owner');
const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'alice@taskflow.dev', password: 'Password123!' }) });
accessToken = login.accessToken;
console.log(login.user);

console.log('3/5 Protected project list');
const projects = await request('/projects');
console.log(`Projects: ${projects.length}`);

console.log('4/5 Refresh-token rotation');
accessToken = '';
const refreshed = await request('/auth/refresh', { method: 'POST' });
accessToken = refreshed.accessToken;
console.log(`Refreshed for ${refreshed.user.email}`);

console.log('5/5 Dashboard');
const dashboard = await request('/dashboard');
console.log({ projectCount: dashboard.projectCount, assignedByStatus: dashboard.assignedByStatus });

console.log('SMOKE PASS');
