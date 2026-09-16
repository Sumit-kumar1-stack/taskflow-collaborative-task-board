'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { Icons } from '@/components/icons';
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, PriorityBadge, Select, Skeleton, StatusBadge, buttonClass } from '@/components/ui';
import { apiFetch } from '@/lib/auth';
import type { Membership, Pagination, Task, TaskListResponse } from '@/lib/types';

export default function BacklogPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<Task[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Pagination | null>(null);
  const [priority, setPriority] = useState('');
  const [assignee, setAssignee] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const query = new URLSearchParams({ page: String(page), pageSize: '10', sortBy, sortOrder });
    if (priority) query.set('priority', priority);
    if (assignee) query.set('assigneeId', assignee);
    if (search) query.set('search', search);
    try {
      const [tasks, projectMembers] = await Promise.all([apiFetch<TaskListResponse>(`/projects/${id}/tasks?${query}`), apiFetch<Membership[]>(`/projects/${id}/members`)]);
      setItems(tasks.items); setMeta(tasks.pagination); setMembers(projectMembers);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load the backlog.'); }
    finally { setLoading(false); }
  }, [id, page, priority, assignee, search, sortBy, sortOrder]);
  useEffect(() => { void load(); }, [load]);

  function submitSearch(event: FormEvent) { event.preventDefault(); setPage(1); setSearch(searchDraft.trim()); }
  function clearFilters() { setPriority(''); setAssignee(''); setSearchDraft(''); setSearch(''); setSortBy('createdAt'); setSortOrder('desc'); setPage(1); }
  const filtering = Boolean(priority || assignee || search || sortBy !== 'createdAt' || sortOrder !== 'desc');

  return <AppShell><PageHeader eyebrow="Project" title="Backlog" description="Search, filter, and sort the full task inventory. Results are processed by the server." actions={<Link className={buttonClass('secondary')} href={`/projects/${id}/board`}><Icons.Board className="h-4 w-4" />Board</Link>} /><Card className="mb-5 p-4"><form onSubmit={submitSearch} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_1fr_1fr_1fr_1fr_auto]"><Field label="Search" htmlFor="search"><div className="relative"><Icons.Search className="absolute left-3 top-3 h-4 w-4 text-slate-600" /><Input id="search" className="pl-9" placeholder="Search task titles" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} /></div></Field><Field label="Priority" htmlFor="priority"><Select id="priority" value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1); }}><option value="">All priorities</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></Select></Field><Field label="Assignee" htmlFor="assignee"><Select id="assignee" value={assignee} onChange={(event) => { setAssignee(event.target.value); setPage(1); }}><option value="">All assignees</option>{members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</Select></Field><Field label="Sort by" htmlFor="sort-by"><Select id="sort-by" value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }}><option value="createdAt">Created date</option><option value="dueDate">Due date</option><option value="priority">Priority</option></Select></Field><Field label="Direction" htmlFor="sort-order"><Select id="sort-order" value={sortOrder} onChange={(event) => { setSortOrder(event.target.value as 'asc' | 'desc'); setPage(1); }}><option value="desc">Descending</option><option value="asc">Ascending</option></Select></Field><div className="flex items-end gap-2"><Button type="submit" loading={loading}>{loading ? 'Loading...' : 'Apply'}</Button>{filtering && <Button type="button" variant="ghost" onClick={clearFilters}>Clear</Button>}</div></form></Card>{error ? <ErrorState title="Unable to load this backlog" message={error} onRetry={load} /> : <Card className="overflow-hidden">{loading ? <div className="space-y-3 p-5" role="status" aria-label="Loading backlog">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div> : items.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="border-b border-line bg-slate-950/50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Task</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Assignee</th><th className="px-5 py-3">Due date</th></tr></thead><tbody className="divide-y divide-line">{items.map((task) => <tr key={task.id} className="hover:bg-slate-900/50"><td className="px-5 py-4"><div className="font-medium text-slate-200">{task.title}</div>{task.description && <div className="mt-1 max-w-md truncate text-xs text-slate-600">{task.description}</div>}</td><td className="px-4 py-4"><StatusBadge status={task.status} /></td><td className="px-4 py-4"><PriorityBadge priority={task.priority} /></td><td className="px-4 py-4 text-slate-400">{task.assignee?.name ?? <span className="text-slate-600">Unassigned</span>}</td><td className="px-5 py-4 text-slate-400">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : <span className="text-slate-600">No date</span>}</td></tr>)}</tbody></table></div> : <EmptyState compact icon={Icons.Search} title="No matching tasks" description={filtering ? 'Try clearing or adjusting your current filters.' : 'Tasks created on the board will appear here.'} action={filtering ? <Button size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button> : undefined} />}</Card>}{meta && !error && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>{meta.total ? `${(meta.page - 1) * meta.pageSize + 1}–${Math.min(meta.page * meta.pageSize, meta.total)} of ${meta.total} tasks` : '0 tasks'}</span><div className="flex items-center gap-3"><Button variant="secondary" size="sm" disabled={loading || page <= 1} onClick={() => setPage((current) => current - 1)}><Icons.ArrowLeft className="h-3.5 w-3.5" />Previous</Button><span className="text-xs">Page {meta.page} of {meta.totalPages}</span><Button variant="secondary" size="sm" disabled={loading || page >= meta.totalPages} onClick={() => setPage((current) => current + 1)}>Next<Icons.ArrowRight className="h-3.5 w-3.5" /></Button></div></div>}</AppShell>;
}
