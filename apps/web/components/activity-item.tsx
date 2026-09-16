import { Avatar } from './ui';
import type { Activity } from '@/lib/types';

const statusName: Record<string, string> = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };

export function relativeTime(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const intervals: Array<[Intl.RelativeTimeFormatUnit, number]> = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, amount] of intervals) if (Math.abs(seconds) >= amount) return formatter.format(Math.round(seconds / amount), unit);
  return 'just now';
}

export function activityText(activity: Activity) {
  const task = activity.task?.title ?? (typeof activity.metadata?.title === 'string' ? activity.metadata.title : 'a task');
  const target = activity.targetUser?.name ?? (typeof activity.metadata?.email === 'string' ? activity.metadata.email : 'a member');
  const from = typeof activity.metadata?.from === 'string' ? statusName[activity.metadata.from] ?? activity.metadata.from : '';
  const to = typeof activity.metadata?.to === 'string' ? statusName[activity.metadata.to] ?? activity.metadata.to : '';
  switch (activity.type) {
    case 'TASK_CREATED': return <>created <strong>&ldquo;{task}&rdquo;</strong></>;
    case 'TASK_MOVED': return <>moved <strong>&ldquo;{task}&rdquo;</strong> <span className="text-slate-500">{from} → {to}</span></>;
    case 'TASK_ASSIGNED': return <>assigned <strong>&ldquo;{task}&rdquo;</strong> to <strong>{target}</strong></>;
    case 'TASK_UNASSIGNED': return <>unassigned <strong>&ldquo;{task}&rdquo;</strong></>;
    case 'TASK_UPDATED': return <>updated <strong>&ldquo;{task}&rdquo;</strong></>;
    case 'TASK_DELETED': return <>deleted <strong>&ldquo;{task}&rdquo;</strong></>;
    case 'MEMBER_INVITED': return <>added <strong>{target}</strong> to the project</>;
    case 'MEMBER_REMOVED': return <>removed <strong>{target}</strong> from the project</>;
    case 'COMMENT_ADDED': return <>commented on <strong>&ldquo;{task}&rdquo;</strong></>;
  }
}

export function ActivityItem({ activity, showProject = false }: { activity: Activity; showProject?: boolean }) {
  return <div className="flex gap-3 py-3"><Avatar name={activity.actor.name} /><div className="min-w-0 flex-1 text-sm leading-5 text-slate-300"><p><strong className="font-semibold text-slate-100">{activity.actor.name}</strong> {activityText(activity)}</p><p className="mt-1 text-xs text-slate-500" title={new Date(activity.createdAt).toLocaleString()}>{showProject && activity.project && <>{activity.project.name}<span className="mx-1.5">·</span></>}{relativeTime(activity.createdAt)}</p></div></div>;
}
