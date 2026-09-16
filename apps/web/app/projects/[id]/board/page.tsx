'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/components/auth-provider';
import { Icons } from '@/components/icons';
import { TaskDialog } from '@/components/task-dialog';
import { useToast } from '@/components/toast-provider';
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, PageHeader, PageSkeleton, PriorityBadge, Select, Textarea, buttonClass, cn } from '@/components/ui';
import { apiFetch, getAccessToken } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import type { Membership, Project, Task, TaskListResponse } from '@/lib/types';

const columns: Array<{ key: Task['status']; label: string; accent: string; empty: string }> = [
  { key: 'TODO', label: 'To Do', accent: 'bg-slate-400', empty: 'New tasks will land here.' },
  { key: 'IN_PROGRESS', label: 'In Progress', accent: 'bg-sky-400', empty: 'Nothing is being worked on.' },
  { key: 'DONE', label: 'Done', accent: 'bg-emerald-400', empty: 'Completed work will collect here.' },
];

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('TODO');
  const [priority, setPriority] = useState<Task['priority']>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Membership | null>(null);
  const [memberBusy, setMemberBusy] = useState(false);
  const [confirmProjectDelete, setConfirmProjectDelete] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [projectData, taskData, memberData] = await Promise.all([apiFetch<Project>(`/projects/${id}`), apiFetch<TaskListResponse>(`/projects/${id}/tasks?page=1&pageSize=100&sortBy=createdAt&sortOrder=desc`), apiFetch<Membership[]>(`/projects/${id}/members`)]);
      setProject(projectData); setTasks(taskData.items); setMembers(memberData);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load this board.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    void load();
    const socket = getSocket(); socket.auth = { token: getAccessToken() }; if (!socket.connected) socket.connect();
    const join = () => socket.emit('project:join', { projectId: id }, () => void load());
    const refresh = () => void load();
    const revoke = (payload: { projectId: string }) => { if (payload.projectId === id) router.push('/projects'); };
    socket.on('connect', join); if (socket.connected) join();
    const events = ['task:created', 'task:updated', 'task:deleted', 'member:invited', 'member:removed', 'comment:created'];
    events.forEach((event) => socket.on(event, refresh)); socket.on('project:access-revoked', revoke);
    return () => { socket.emit('project:leave', { projectId: id }); socket.off('connect', join); events.forEach((event) => socket.off(event, refresh)); socket.off('project:access-revoked', revoke); };
  }, [id, load, router]);

  const grouped = useMemo(() => Object.fromEntries(columns.map((column) => [column.key, tasks.filter((task) => task.status === column.key)])) as Record<Task['status'], Task[]>, [tasks]);
  const myMembership = members.find((membership) => membership.user.id === user?.id);
  const isOwner = myMembership?.role === 'OWNER';
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  async function createTask(event: FormEvent) {
    event.preventDefault(); setFormError('');
    if (!title.trim()) return setFormError('Title is required.');
    if (dueDate && new Date(`${dueDate}T23:59:59`).getTime() < Date.now()) return setFormError('Due date cannot be in the past.');
    setSaving(true);
    try { await apiFetch(`/projects/${id}/tasks`, { method: 'POST', body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, status, priority, assigneeId: assigneeId || undefined, dueDate: dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : undefined }) }); setTitle(''); setDescription(''); setStatus('TODO'); setPriority('MEDIUM'); setAssigneeId(''); setDueDate(''); toast('Task created'); await load(); }
    catch (caught) { setFormError(caught instanceof Error ? caught.message : 'Unable to create the task.'); }
    finally { setSaving(false); }
  }

  async function invite(event: FormEvent) {
    event.preventDefault(); setInviteError('');
    if (!/^\S+@\S+\.\S+$/.test(inviteEmail)) return setInviteError('Enter a valid email address.');
    setInviting(true);
    try { await apiFetch(`/projects/${id}/members`, { method: 'POST', body: JSON.stringify({ email: inviteEmail.trim() }) }); setInviteEmail(''); toast('Member invited'); await load(); }
    catch (caught) { setInviteError(caught instanceof Error ? caught.message : 'Unable to invite this member.'); }
    finally { setInviting(false); }
  }

  async function removeMember() {
    if (!removeTarget) return;
    setMemberBusy(true);
    try { await apiFetch(`/projects/${id}/members/${removeTarget.user.id}`, { method: 'DELETE' }); toast(`${removeTarget.user.name} removed`); setRemoveTarget(null); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to remove this member.'); setRemoveTarget(null); }
    finally { setMemberBusy(false); }
  }

  async function deleteProject() {
    setDeletingProject(true);
    try { await apiFetch(`/projects/${id}`, { method: 'DELETE' }); toast('Project deleted'); router.push('/projects'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to delete this project.'); setConfirmProjectDelete(false); setDeletingProject(false); }
  }

  async function changeTask(taskId: string, patch: Record<string, unknown>) { await apiFetch(`/projects/${id}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(patch) }); await load(); }
  async function removeTask(taskId: string) { await apiFetch(`/projects/${id}/tasks/${taskId}`, { method: 'DELETE' }); await load(); }

  if (loading) return <AppShell><PageSkeleton cards={3} /></AppShell>;
  if (error && !project) return <AppShell><ErrorState title="Unable to load this board" message={error} onRetry={() => { setLoading(true); void load(); }} /></AppShell>;

  return <AppShell>{project && <><PageHeader eyebrow="Project board" title={project.name} description={project.description || 'Coordinate tasks and keep delivery moving.'} actions={<><Link className={buttonClass('secondary')} href={`/projects/${id}/backlog`}><Icons.List className="h-4 w-4" />Backlog</Link><Link className={buttonClass('secondary')} href={`/projects/${id}/activity`}><Icons.Activity className="h-4 w-4" />Activity</Link>{isOwner && <Button variant="danger" onClick={() => setConfirmProjectDelete(true)}><Icons.Trash className="h-4 w-4" /><span className="hidden sm:inline">Delete project</span></Button>}</>} />{error && <div className="mb-4"><ErrorState compact title="An action couldn't be completed" message={error} onRetry={load} /></div>}<div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]"><section className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 2xl:mx-0 2xl:grid 2xl:grid-cols-3 2xl:overflow-visible 2xl:px-0">{columns.map((column) => <div key={column.key} className="min-h-[430px] w-[300px] shrink-0 snap-start rounded-xl border border-line bg-panel/60 sm:w-[340px] 2xl:w-auto"><header className="flex items-center justify-between border-b border-line px-4 py-3"><div className="flex items-center gap-2"><span className={cn('h-2 w-2 rounded-full', column.accent)} /><h2 className="text-sm font-semibold text-slate-200">{column.label}</h2></div><Badge className="border-line bg-slate-900 text-slate-400">{grouped[column.key].length}</Badge></header><div className="space-y-3 p-3">{grouped[column.key].length ? grouped[column.key].map((task) => <BoardTaskCard key={task.id} task={task} members={members} onOpen={() => setSelectedTaskId(task.id)} onMove={changeTask} />) : <EmptyState compact icon={Icons.List} title="No tasks" description={column.empty} />}</div></div>)}</section><aside className="grid items-start gap-4 lg:grid-cols-2 2xl:block 2xl:space-y-4"><Card className="p-5"><div className="mb-4"><h2 className="font-semibold text-white">Create task</h2><p className="mt-1 text-xs text-slate-500">Add a clear, actionable item to this board.</p></div><form onSubmit={createTask} className="space-y-3" noValidate><Field label="Title" htmlFor="task-title-new"><Input id="task-title-new" value={title} maxLength={200} placeholder="What needs to be done?" onChange={(event) => setTitle(event.target.value)} /></Field><Field label="Description" htmlFor="task-description-new"><Textarea id="task-description-new" className="min-h-20" value={description} maxLength={5000} placeholder="Optional details" onChange={(event) => setDescription(event.target.value)} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Status" htmlFor="task-status-new"><Select id="task-status-new" value={status} onChange={(event) => setStatus(event.target.value as Task['status'])}><option value="TODO">To Do</option><option value="IN_PROGRESS">In Progress</option><option value="DONE">Done</option></Select></Field><Field label="Priority" htmlFor="task-priority-new"><Select id="task-priority-new" value={priority} onChange={(event) => setPriority(event.target.value as Task['priority'])}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></Select></Field></div><Field label="Assignee" htmlFor="task-assignee-new"><Select id="task-assignee-new" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}><option value="">Unassigned</option>{members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</Select></Field><Field label="Due date" htmlFor="task-due-new"><Input id="task-due-new" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field>{formError && <p className="error" role="alert">{formError}</p>}<Button className="w-full" type="submit" loading={saving}>{saving ? 'Creating...' : 'Create task'}</Button></form></Card><div className="space-y-4"><Card className="p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-white">Members</h2><p className="mt-0.5 text-xs text-slate-500">{members.length} {members.length === 1 ? 'person' : 'people'} in this project</p></div><Icons.Users className="h-4 w-4 text-slate-500" /></div><div className="divide-y divide-line">{members.map((membership) => <div key={membership.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><Avatar name={membership.user.name} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-slate-200">{membership.user.name}</div><div className="truncate text-xs text-slate-600">{membership.user.email}</div></div><div className="flex items-center gap-2"><Badge className={membership.role === 'OWNER' ? 'border-indigo-700/60 bg-indigo-950/60 text-indigo-300' : 'border-line bg-slate-900 text-slate-500'}>{membership.role === 'OWNER' ? 'Owner' : 'Member'}</Badge>{isOwner && membership.role !== 'OWNER' && <Button aria-label={`Remove ${membership.user.name}`} title={`Remove ${membership.user.name}`} variant="ghost" size="sm" onClick={() => setRemoveTarget(membership)}><Icons.Close className="h-3.5 w-3.5 text-rose-400" /></Button>}</div></div>)}</div></Card>{isOwner && <Card className="p-5"><h2 className="font-semibold text-white">Invite member</h2><p className="mt-1 text-xs leading-5 text-slate-500">Add an existing TaskFlow user by email address.</p><form onSubmit={invite} className="mt-4 space-y-3" noValidate><Field label="Email address" htmlFor="invite-email"><Input id="invite-email" type="email" value={inviteEmail} placeholder="member@example.com" onChange={(event) => setInviteEmail(event.target.value)} /></Field>{inviteError && <p className="error" role="alert">{inviteError}</p>}<Button className="w-full" type="submit" loading={inviting}>{inviting ? 'Inviting...' : 'Invite member'}</Button></form></Card>}</div></aside></div><TaskDialog task={selectedTask} members={members} projectId={id} onClose={() => setSelectedTaskId(null)} onChange={changeTask} onDelete={removeTask} /><ConfirmDialog open={Boolean(removeTarget)} title={`Remove ${removeTarget?.user.name ?? 'member'}?`} description="They will lose access immediately and their assigned tasks will become unassigned. Project-owner authorization is still enforced by the API." confirmLabel="Remove" busy={memberBusy} onClose={() => setRemoveTarget(null)} onConfirm={removeMember} /><ConfirmDialog open={confirmProjectDelete} title={`Delete “${project.name}”?`} description="This permanently deletes the project, every task, comment, membership, and activity record. This action cannot be undone." confirmLabel="Delete" busy={deletingProject} onClose={() => setConfirmProjectDelete(false)} onConfirm={deleteProject} /></>}</AppShell>;
}

function BoardTaskCard({ task, members, onOpen, onMove }: { task: Task; members: Membership[]; onOpen: () => void; onMove: (taskId: string, patch: Record<string, unknown>) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function move(next: Task['status']) { setBusy(true); setError(''); try { await onMove(task.id, { status: next }); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to move this task.'); } finally { setBusy(false); } }
  return <article className="rounded-lg border border-line bg-slate-950/55 p-4 shadow-sm hover:border-slate-600 hover:bg-slate-950/80"><button className="block w-full text-left" onClick={onOpen}><div className="flex items-start justify-between gap-3"><h3 className="font-medium leading-5 text-slate-100">{task.title}</h3><PriorityBadge priority={task.priority} /></div>{task.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{task.description}</p>}<div className="mt-4 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2">{task.assignee ? <><Avatar name={task.assignee.name} size="sm" /><span className="truncate text-xs text-slate-500">{task.assignee.name}</span></> : <span className="flex items-center gap-1.5 text-xs text-slate-600"><Icons.User className="h-3.5 w-3.5" />Unassigned</span>}</div>{(task._count?.comments ?? 0) > 0 && <span className="flex items-center gap-1 text-xs text-slate-600"><Icons.Comment className="h-3.5 w-3.5" />{task._count?.comments}</span>}</div>{task.dueDate && <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-xs text-slate-500"><Icons.Clock className="h-3.5 w-3.5" />Due {new Date(task.dueDate).toLocaleDateString()}</div>}</button><div className="mt-3 border-t border-line pt-3"><label className="sr-only" htmlFor={`move-${task.id}`}>Move {task.title}</label><Select id={`move-${task.id}`} className="min-h-8 py-1 text-xs" value={task.status} disabled={busy} onChange={(event) => void move(event.target.value as Task['status'])}>{columns.map((column) => <option key={column.key} value={column.key}>Move to {column.label}</option>)}</Select>{error && <p className="mt-2 text-xs text-rose-300" role="alert">{error}</p>}</div></article>;
}
