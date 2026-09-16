'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { Icons } from '@/components/icons';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, PageSkeleton, Textarea } from '@/components/ui';
import { useToast } from '@/components/toast-provider';
import { apiFetch } from '@/lib/auth';
import { useAuth } from '@/components/auth-provider';
import type { Project } from '@/lib/types';

export default function ProjectsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { setLoading(true); setLoadError(''); try { setProjects(await apiFetch<Project[]>('/projects')); } catch (caught) { setLoadError(caught instanceof Error ? caught.message : 'Unable to load projects.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault(); setFormError('');
    if (name.trim().length < 2) return setFormError('Project name must be at least 2 characters.');
    setSaving(true);
    try { await apiFetch('/projects', { method: 'POST', body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }) }); setName(''); setDescription(''); toast('Project created'); await load(); }
    catch (caught) { setFormError(caught instanceof Error ? caught.message : 'Unable to create the project.'); }
    finally { setSaving(false); }
  }

  return <AppShell>{loading && !projects.length ? <PageSkeleton cards={3} /> : <><PageHeader title="Projects" description="Plan work, coordinate your team, and track delivery in one place." /><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><section>{loadError && <div className="mb-4"><ErrorState title="We couldn't load your projects" message={loadError} onRetry={load} /></div>}{projects.length ? <div className="grid gap-4 md:grid-cols-2">{projects.map((project) => { const role = project.memberships?.find((membership) => membership.user.id === user?.id)?.role ?? 'MEMBER'; return <Link key={project.id} href={`/projects/${project.id}/board`} className="group rounded-xl border border-line bg-panel p-5 shadow-panel hover:-translate-y-0.5 hover:border-indigo-500/50"><div className="flex items-start justify-between gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-300"><Icons.Folder className="h-5 w-5" /></div><Badge className={role === 'OWNER' ? 'border-indigo-700/60 bg-indigo-950/60 text-indigo-300' : 'border-line bg-slate-900 text-slate-400'}>{role === 'OWNER' ? 'Owner' : 'Member'}</Badge></div><h2 className="mt-5 font-semibold text-white group-hover:text-indigo-300">{project.name}</h2><p className="mt-1 min-h-10 text-sm leading-5 text-slate-500 line-clamp-2">{project.description || 'No description provided.'}</p><div className="mt-5 flex items-center gap-4 border-t border-line pt-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><Icons.List className="h-3.5 w-3.5" />{project._count?.tasks ?? 0} tasks</span><span className="flex items-center gap-1.5"><Icons.Users className="h-3.5 w-3.5" />{project.memberships?.length ?? 0} members</span><Icons.ArrowRight className="ml-auto h-4 w-4 text-slate-600 group-hover:text-indigo-400" /></div></Link>; })}</div> : !loadError && <EmptyState title="Create your first project" description="Projects give your team a shared board, backlog, members, and activity history." action={<a href="#new-project" className="btn"><Icons.Plus className="h-4 w-4" />New project</a>} />}</section><aside id="new-project"><Card className="sticky top-24 p-5"><div className="mb-5"><div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-indigo-500/10 text-indigo-300"><Icons.Plus className="h-4 w-4" /></div><h2 className="font-semibold text-white">New project</h2><p className="mt-1 text-sm text-slate-500">Create a focused space for a team initiative.</p></div><form onSubmit={create} className="space-y-4" noValidate><Field label="Project name" htmlFor="project-name"><Input id="project-name" placeholder="e.g. Website launch" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} /></Field><Field label="Description" htmlFor="project-description" hint="Optional · Keep it concise"><Textarea id="project-description" placeholder="What is this project trying to achieve?" value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} /></Field>{formError && <p className="error" role="alert">{formError}</p>}<Button className="w-full" loading={saving} type="submit">{saving ? 'Creating...' : 'Create project'}</Button></form></Card></aside></div></>}</AppShell>;
}
