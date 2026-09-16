'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { Icons } from '@/components/icons';
import { EmptyState, ErrorState, PageHeader, PageSkeleton, PriorityBadge, StatusBadge } from '@/components/ui';
import { apiFetch, getAccessToken } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import type { Task } from '@/lib/types';

const groups: Array<{ status: Task['status']; label: string; accent: string }> = [{ status: 'TODO', label: 'To Do', accent: 'bg-slate-500' }, { status: 'IN_PROGRESS', label: 'In Progress', accent: 'bg-sky-400' }, { status: 'DONE', label: 'Done', accent: 'bg-emerald-400' }];

export default function AssignedPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setError(''); try { setTasks(await apiFetch<Task[]>('/tasks/assigned-to-me')); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load assigned tasks.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); const socket = getSocket(); socket.auth = { token: getAccessToken() }; if (!socket.connected) socket.connect(); socket.on('assigned:changed', load); return () => { socket.off('assigned:changed', load); }; }, [load]);
  const grouped = useMemo(() => Object.fromEntries(groups.map((group) => [group.status, tasks.filter((task) => task.status === group.status)])) as Record<Task['status'], Task[]>, [tasks]);

  return <AppShell>{loading ? <PageSkeleton cards={3} /> : <><PageHeader title="Assigned to me" description="Your personal workload across every project, updated in real time." />{error ? <ErrorState title="We couldn't load your tasks" message={error} onRetry={load} /> : !tasks.length ? <EmptyState icon={Icons.Check} title="You're all caught up" description="Tasks assigned to you will appear here automatically." /> : <div className="grid gap-4 lg:grid-cols-3">{groups.map((group) => <section key={group.status} className="rounded-xl border border-line bg-panel/70"><header className="flex items-center justify-between border-b border-line px-4 py-3"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${group.accent}`} /><h2 className="text-sm font-semibold">{group.label}</h2></div><span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{grouped[group.status].length}</span></header><div className="space-y-2 p-3">{grouped[group.status].length ? grouped[group.status].map((task) => <Link key={task.id} href={`/projects/${task.projectId}/board`} className="group block rounded-lg border border-line bg-slate-950/40 p-4 hover:border-indigo-500/50"><div className="mb-3 flex items-start justify-between gap-2"><h3 className="font-medium leading-5 text-slate-200 group-hover:text-indigo-300">{task.title}</h3><PriorityBadge priority={task.priority} /></div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={task.status} /><span className="truncate text-xs text-slate-500">{task.project?.name}</span></div>{task.dueDate && <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Icons.Clock className="h-3.5 w-3.5" />Due {new Date(task.dueDate).toLocaleDateString()}</div>}</Link>) : <EmptyState compact icon={Icons.List} title="No tasks" description={`Nothing ${group.label.toLowerCase()} right now.`} />}</div></section>)}</div>}</>}</AppShell>;
}
