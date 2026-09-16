'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { ActivityItem } from '@/components/activity-item';
import { Icons, type IconProps } from '@/components/icons';
import { Card, EmptyState, ErrorState, PageHeader, PageSkeleton, SectionHeader, buttonClass } from '@/components/ui';
import { apiFetch } from '@/lib/auth';
import type { DashboardData } from '@/lib/types';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await apiFetch<DashboardData>('/dashboard')); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load the dashboard.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <AppShell>{loading && !data ? <PageSkeleton /> : error && !data ? <ErrorState title="We couldn't load your dashboard" message={error} onRetry={load} /> : data && <><PageHeader title="Dashboard" description="A quick view of your work and what changed recently." actions={<Link className={buttonClass()} href="/projects"><Icons.Plus className="h-4 w-4" />New project</Link>} /><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Projects" value={data.projectCount} supporting="Active memberships" icon={Icons.Folder} tone="indigo" /><Stat label="To Do" value={data.assignedByStatus.TODO} supporting="Assigned to you" icon={Icons.List} tone="slate" /><Stat label="In Progress" value={data.assignedByStatus.IN_PROGRESS} supporting="Currently active" icon={Icons.Clock} tone="sky" /><Stat label="Completed" value={data.completedThisWeek} supporting="This week" icon={Icons.Check} tone="emerald" /></section><section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><Card className="p-5"><SectionHeader title="Most open work" description="Project with the largest active queue" />{data.projectWithMostOpenTasks ? <Link href={`/projects/${data.projectWithMostOpenTasks.id}/board`} className="group block rounded-lg border border-line bg-slate-950/40 p-4 hover:border-indigo-500/50"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-slate-100 group-hover:text-indigo-300">{data.projectWithMostOpenTasks.name}</p><p className="mt-1 text-sm text-slate-500">Open the board to review and prioritize.</p></div><span className="text-3xl font-bold tracking-tight text-white">{data.projectWithMostOpenTasks.openTasks}</span></div><div className="mt-4 flex items-center text-xs font-semibold text-indigo-400">View board <Icons.ArrowRight className="ml-1 h-3.5 w-3.5" /></div></Link> : <EmptyState compact title="Everything is clear" description="There are no open tasks across your projects." icon={Icons.Check} />}</Card><Card className="p-5"><SectionHeader title="Recent activity" description="Latest updates across your projects" action={<Link href="/projects" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">View projects</Link>} />{data.recentActivity.length ? <div className="divide-y divide-line">{data.recentActivity.map((activity) => <ActivityItem key={activity.id} activity={activity} showProject />)}</div> : <EmptyState compact title="No activity yet" description="Team updates will appear here as work gets moving." icon={Icons.Activity} />}</Card></section></>}</AppShell>;
}

function Stat({ label, value, supporting, icon: Icon, tone }: { label: string; value: number; supporting: string; icon: (props: IconProps) => React.ReactNode; tone: 'indigo' | 'slate' | 'sky' | 'emerald' }) {
  const styles = { indigo: 'bg-indigo-500/10 text-indigo-300', slate: 'bg-slate-700/40 text-slate-300', sky: 'bg-sky-500/10 text-sky-300', emerald: 'bg-emerald-500/10 text-emerald-300' };
  return <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</p></div><div className={`grid h-9 w-9 place-items-center rounded-lg ${styles[tone]}`}><Icon className="h-5 w-5" /></div></div><p className="mt-2 text-xs text-slate-600">{supporting}</p></Card>;
}
