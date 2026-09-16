'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ActivityItem } from '@/components/activity-item';
import { AppShell } from '@/components/app-shell';
import { Icons } from '@/components/icons';
import { Card, EmptyState, ErrorState, PageHeader, Skeleton, buttonClass } from '@/components/ui';
import { apiFetch, getAccessToken } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import type { Activity } from '@/lib/types';

export default function ActivityPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<Activity[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setError(''); try { setItems(await apiFetch<Activity[]>(`/projects/${id}/activities`)); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load activity.'); } finally { setLoading(false); } }, [id]);
  useEffect(() => { void load(); const socket = getSocket(); socket.auth = { token: getAccessToken() }; if (!socket.connected) socket.connect(); const join = () => socket.emit('project:join', { projectId: id }); socket.on('connect', join); if (socket.connected) join(); socket.on('activity:changed', load); return () => { socket.off('connect', join); socket.off('activity:changed', load); socket.emit('project:leave', { projectId: id }); }; }, [id, load]);

  return <AppShell><PageHeader eyebrow="Project" title="Activity" description="A human-readable history of changes, newest first." actions={<Link className={buttonClass('secondary')} href={`/projects/${id}/board`}><Icons.Board className="h-4 w-4" />Board</Link>} />{error ? <ErrorState title="We couldn't load project activity" message={error} onRetry={load} /> : <Card className="mx-auto max-w-3xl px-5 py-2">{loading ? <div className="space-y-4 py-4" role="status" aria-label="Loading activity">{Array.from({ length: 6 }, (_, index) => <div className="flex gap-3" key={index}><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="mt-2 h-3 w-24" /></div></div>)}</div> : items.length ? <div className="divide-y divide-line">{items.map((activity) => <ActivityItem key={activity.id} activity={activity} />)}</div> : <EmptyState compact icon={Icons.Activity} title="No activity yet" description="Project changes and comments will appear here." />}</Card>}</AppShell>;
}
