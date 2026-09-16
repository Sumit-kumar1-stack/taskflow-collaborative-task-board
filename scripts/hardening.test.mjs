import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { after, before, describe, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';

const apiDirectory = fileURLToPath(new URL('../apps/api/', import.meta.url));
const apiEnvPath = fileURLToPath(new URL('../apps/api/.env', import.meta.url));
const envResult = dotenv.config({ path: apiEnvPath });
if (envResult.error) throw envResult.error;
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const { PrismaClient } = await import('@prisma/client');

const apiPort = 44_000 + Math.floor(Math.random() * 1_000);
const API = `http://127.0.0.1:${apiPort}/api`;
const prisma = new PrismaClient();
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const projectName = `Hardening ${runId}`;
const emails = {
  owner: `hardening-owner-${runId}@taskflow.dev`,
  member: `hardening-member-${runId}@taskflow.dev`,
  peer: `hardening-peer-${runId}@taskflow.dev`,
  external: `hardening-external-${runId}@taskflow.dev`,
};

let owner;
let member;
let peer;
let external;
let projectId;
let memberId;
let peerId;
let externalId;
let workflowTaskId;
let apiProcess;
let apiStdout = '';
let apiStderr = '';

function apiFailure(message, { code = apiProcess?.exitCode, signal = apiProcess?.signalCode, error } = {}) {
  const status = code !== null && code !== undefined
    ? `Exit code: ${code}`
    : `Exit code: unavailable${signal ? ` (signal: ${signal})` : ''}`;
  return new Error([
    message,
    status,
    error ? `Spawn error: ${error.message}` : null,
    '',
    'STDOUT:',
    apiStdout || '(empty)',
    '',
    'STDERR:',
    apiStderr || '(empty)',
  ].filter((line) => line !== null).join('\n'));
}

async function startApi() {
  apiProcess = spawn(process.execPath, ['dist/src/main.js'], {
    cwd: apiDirectory,
    env: { ...process.env, API_PORT: String(apiPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  apiProcess.stdout.on('data', (chunk) => { apiStdout += chunk.toString(); });
  apiProcess.stderr.on('data', (chunk) => { apiStderr += chunk.toString(); });

  let spawnError;
  let exitResult;
  const childStopped = new Promise((resolve) => {
    apiProcess.once('error', (error) => {
      spawnError = error;
      resolve();
    });
    apiProcess.once('exit', (code, signal) => {
      exitResult = { code, signal };
      resolve();
    });
  });

  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (spawnError || exitResult) {
      throw apiFailure('Test API exited before becoming healthy.', {
        code: exitResult?.code,
        signal: exitResult?.signal,
        error: spawnError,
      });
    }
    try {
      const response = await fetch(`${API}/health`, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {
      // The API is still starting.
    }
    await Promise.race([delay(250), childStopped]);
  }
  throw apiFailure('Timed out waiting 25 seconds for the test API to become healthy.');
}

async function stopApi() {
  if (!apiProcess || apiProcess.exitCode !== null || apiProcess.signalCode !== null) return;

  const exited = new Promise((resolve) => apiProcess.once('exit', resolve));
  apiProcess.kill('SIGTERM');
  await Promise.race([exited, delay(5_000)]);

  if (apiProcess.exitCode === null && apiProcess.signalCode === null) {
    apiProcess.kill('SIGKILL');
    await exited;
  }
}

async function http(path, { session, cookie, ...init } = {}) {
  const headers = new Headers(init.headers ?? {});
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (session?.accessToken) headers.set('authorization', `Bearer ${session.accessToken}`);
  if (cookie) headers.set('cookie', cookie);
  const response = await fetch(`${API}${path}`, { ...init, headers });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0] ?? null };
}

async function signup(role) {
  const response = await http('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: `Hardening ${role}`, email: emails[role], password: 'Password123!' }),
  });
  assert.equal(response.status, 201, `Unable to create ${role}: ${JSON.stringify(response.data)}`);
  return { accessToken: response.data.accessToken, cookie: response.cookie, user: response.data.user };
}

async function createTask(session, body) {
  return http(`/projects/${projectId}/tasks`, { session, method: 'POST', body: JSON.stringify(body) });
}

before(async () => {
  try {
    await startApi();
    [owner, member, peer, external] = await Promise.all(['owner', 'member', 'peer', 'external'].map(signup));
    memberId = member.user.id;
    peerId = peer.user.id;
    externalId = external.user.id;
    const created = await http('/projects', { session: owner, method: 'POST', body: JSON.stringify({ name: projectName, description: 'Isolated automated hardening test data' }) });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    projectId = created.data.id;
  } catch (error) {
    await stopApi();
    throw error;
  }
});

after(async () => {
  try {
    if (projectId) await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
  } finally {
    await prisma.$disconnect();
    await stopApi();
  }
});

describe('TaskFlow critical backend requirements', { concurrency: false }, () => {
  test('1. unauthenticated protected request returns 401', async () => {
    const response = await http('/projects');
    assert.equal(response.status, 401);
    assert.match(response.data.message, /access token required/i);
  });

  test('2. authenticated non-project-member receives 403', async () => {
    const response = await http(`/projects/${projectId}`, { session: external });
    assert.equal(response.status, 403);
    assert.match(response.data.message, /not a member/i);
  });

  test('3. OWNER can invite members', async () => {
    for (const email of [emails.member, emails.peer]) {
      const response = await http(`/projects/${projectId}/members`, { session: owner, method: 'POST', body: JSON.stringify({ email }) });
      assert.equal(response.status, 201, JSON.stringify(response.data));
      assert.equal(response.data.role, 'MEMBER');
    }
  });

  test('4. duplicate membership returns 409 Conflict', async () => {
    const response = await http(`/projects/${projectId}/members`, { session: owner, method: 'POST', body: JSON.stringify({ email: emails.member }) });
    assert.equal(response.status, 409);
    assert.match(response.data.message, /already a member/i);
  });

  test('5. MEMBER cannot remove members', async () => {
    const response = await http(`/projects/${projectId}/members/${peerId}`, { session: member, method: 'DELETE' });
    assert.equal(response.status, 403);
    assert.match(response.data.message, /only the project owner/i);
  });

  test('6. MEMBER cannot delete a project', async () => {
    const response = await http(`/projects/${projectId}`, { session: member, method: 'DELETE' });
    assert.equal(response.status, 403);
    assert.match(response.data.message, /only the project owner/i);
  });

  test('7. empty task title is rejected', async () => {
    const response = await createTask(owner, { title: ' ', priority: 'MEDIUM' });
    assert.equal(response.status, 400);
    assert.match(response.data.message, /title cannot be empty/i);
  });

  test('8. past due date is rejected on creation', async () => {
    const response = await createTask(owner, { title: 'Past task', priority: 'LOW', dueDate: new Date(Date.now() - 86_400_000).toISOString() });
    assert.equal(response.status, 400);
    assert.match(response.data.message, /due date cannot be in the past/i);
  });

  test('9. a non-project-member cannot be assigned', async () => {
    const response = await createTask(owner, { title: 'Invalid assignment', priority: 'HIGH', assigneeId: externalId });
    assert.equal(response.status, 400);
    assert.match(response.data.message, /assignee must be a current member/i);
  });

  test('10. ordinary non-assignee MEMBER cannot mark a task Done', async () => {
    const created = await createTask(owner, { title: 'Done permission workflow', priority: 'HIGH', assigneeId: memberId });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    workflowTaskId = created.data.id;
    const response = await http(`/projects/${projectId}/tasks/${workflowTaskId}`, { session: peer, method: 'PATCH', body: JSON.stringify({ status: 'DONE' }) });
    assert.equal(response.status, 403);
    assert.match(response.data.message, /only the task assignee or project owner/i);
  });

  test('11. OWNER can mark another assignee\'s task Done', async () => {
    const response = await http(`/projects/${projectId}/tasks/${workflowTaskId}`, { session: owner, method: 'PATCH', body: JSON.stringify({ status: 'DONE' }) });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    assert.equal(response.data.status, 'DONE');
  });

  test('12. moving into Done sets completedAt', async () => {
    const task = await prisma.task.findUniqueOrThrow({ where: { id: workflowTaskId } });
    assert.equal(task.status, 'DONE');
    assert.ok(task.completedAt instanceof Date);
  });

  test('13. moving out of Done clears completedAt', async () => {
    const response = await http(`/projects/${projectId}/tasks/${workflowTaskId}`, { session: peer, method: 'PATCH', body: JSON.stringify({ status: 'IN_PROGRESS' }) });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    assert.equal(response.data.completedAt, null);
    const task = await prisma.task.findUniqueOrThrow({ where: { id: workflowTaskId } });
    assert.equal(task.completedAt, null);
  });

  test('14. existing assignee can mark their task Done', async () => {
    const response = await http(`/projects/${projectId}/tasks/${workflowTaskId}`, { session: member, method: 'PATCH', body: JSON.stringify({ status: 'DONE' }) });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    assert.ok(response.data.completedAt);
  });

  test('15. removing a member does not delete tasks they created', async () => {
    const createdByMember = await createTask(member, { title: 'Member-created retained task', priority: 'MEDIUM', assigneeId: memberId });
    assert.equal(createdByMember.status, 201, JSON.stringify(createdByMember.data));
    const assignedToMember = await createTask(owner, { title: 'Owner-created assigned task', priority: 'LOW', assigneeId: memberId });
    assert.equal(assignedToMember.status, 201, JSON.stringify(assignedToMember.data));
    const removed = await http(`/projects/${projectId}/members/${memberId}`, { session: owner, method: 'DELETE' });
    assert.equal(removed.status, 200, JSON.stringify(removed.data));
    assert.equal(await prisma.task.count({ where: { id: createdByMember.data.id, createdById: memberId } }), 1);
  });

  test('16. tasks assigned to a removed member become unassigned', async () => {
    const assigned = await prisma.task.findMany({ where: { projectId, title: { in: ['Member-created retained task', 'Owner-created assigned task'] } } });
    assert.equal(assigned.length, 2);
    assert.ok(assigned.every((task) => task.assigneeId === null));
  });

  test('17. removed member loses project API access', async () => {
    const response = await http(`/projects/${projectId}`, { session: member });
    assert.equal(response.status, 403);
    assert.match(response.data.message, /not a member/i);
  });

  test('18. valid refresh token rotates atomically', async () => {
    const oldCookie = owner.cookie;
    const attempts = await Promise.all([
      http('/auth/refresh', { cookie: oldCookie, method: 'POST' }),
      http('/auth/refresh', { cookie: oldCookie, method: 'POST' }),
    ]);
    const successes = attempts.filter((response) => response.status === 201);
    const failures = attempts.filter((response) => response.status === 401);
    assert.equal(successes.length, 1, JSON.stringify(attempts.map(({ status, data }) => ({ status, data }))));
    assert.equal(failures.length, 1);
    assert.ok(successes[0].cookie);
    owner = { ...owner, accessToken: successes[0].data.accessToken, cookie: successes[0].cookie };
  });

  test('19. old or revoked refresh token cannot be reused', async () => {
    const originalCookie = (await prisma.refreshToken.findMany({ where: { userId: owner.user.id }, orderBy: { createdAt: 'asc' } })).length;
    assert.ok(originalCookie >= 2);
    const revokedTokenAttempt = await http('/auth/refresh', { cookie: owner.cookie, method: 'POST' });
    assert.equal(revokedTokenAttempt.status, 201);
    const reused = await http('/auth/refresh', { cookie: owner.cookie, method: 'POST' });
    assert.equal(reused.status, 401);
    owner = { ...owner, accessToken: revokedTokenAttempt.data.accessToken, cookie: revokedTokenAttempt.cookie };
  });

  test('20. task pagination is performed by backend parameters', async () => {
    const fixtures = [
      ['Query Low', 'LOW', 5],
      ['Query Needle High', 'HIGH', 1],
      ['Query Medium', 'MEDIUM', 3],
      ['Query Other High', 'HIGH', 2],
      ['Query Low Second', 'LOW', 4],
    ];
    for (const [title, priority, days] of fixtures) {
      const created = await createTask(owner, { title, priority, assigneeId: peerId, dueDate: new Date(Date.now() + Number(days) * 86_400_000).toISOString() });
      assert.equal(created.status, 201, JSON.stringify(created.data));
    }
    const first = await http(`/projects/${projectId}/tasks?page=1&pageSize=2&search=Query&sortBy=createdAt&sortOrder=asc`, { session: owner });
    const second = await http(`/projects/${projectId}/tasks?page=2&pageSize=2&search=Query&sortBy=createdAt&sortOrder=asc`, { session: owner });
    assert.equal(first.status, 200);
    assert.equal(first.data.items.length, 2);
    assert.equal(first.data.pagination.pageSize, 2);
    assert.equal(first.data.pagination.total, 5);
    assert.equal(second.data.items.length, 2);
    assert.equal(first.data.items.some((item) => second.data.items.some((other) => other.id === item.id)), false);
  });

  test('21. priority, assignee, and title search combine on the server', async () => {
    const response = await http(`/projects/${projectId}/tasks?page=1&pageSize=20&priority=HIGH&assigneeId=${peerId}&search=Needle`, { session: owner });
    assert.equal(response.status, 200);
    assert.deepEqual(response.data.items.map((item) => item.title), ['Query Needle High']);
    assert.equal(response.data.pagination.total, 1);
  });

  test('22. priority, dueDate, and createdAt sorting honor backend parameters', async () => {
    const queries = await Promise.all(['priority', 'dueDate', 'createdAt'].map((sortBy) => http(`/projects/${projectId}/tasks?page=1&pageSize=100&search=Query&sortBy=${sortBy}&sortOrder=asc`, { session: owner })));
    assert.ok(queries.every((response) => response.status === 200));
    const priorityRank = { LOW: 0, MEDIUM: 1, HIGH: 2 };
    const priorities = queries[0].data.items.map((item) => priorityRank[item.priority]);
    assert.deepEqual(priorities, [...priorities].sort((a, b) => a - b));
    const dueDates = queries[1].data.items.map((item) => new Date(item.dueDate).getTime());
    assert.deepEqual(dueDates, [...dueDates].sort((a, b) => a - b));
    const createdDates = queries[2].data.items.map((item) => new Date(item.createdAt).getTime());
    assert.deepEqual(createdDates, [...createdDates].sort((a, b) => a - b));
  });
});
