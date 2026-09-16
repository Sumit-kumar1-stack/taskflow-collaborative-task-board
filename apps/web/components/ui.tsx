'use client';

import { forwardRef, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Icons, type IconProps } from './icons';
import type { Task } from '@/lib/types';

export function cn(...classes: Array<string | false | null | undefined>) { return classes.filter(Boolean).join(' '); }

const buttonVariants = {
  primary: 'bg-indigo-500 text-white hover:bg-indigo-400 border-transparent',
  secondary: 'border-line bg-slate-900/70 text-slate-200 hover:border-slate-600 hover:bg-slate-800',
  ghost: 'border-transparent bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white',
  danger: 'border-rose-800/70 bg-rose-950/40 text-rose-200 hover:bg-rose-900/60',
};

export function buttonClass(variant: keyof typeof buttonVariants = 'primary', size: 'sm' | 'md' = 'md') {
  return cn('inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50', size === 'sm' ? 'min-h-8 px-2.5 py-1.5 text-xs' : 'min-h-10 px-4 py-2 text-sm', buttonVariants[variant]);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonVariants; size?: 'sm' | 'md'; loading?: boolean };
export function Button({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }: ButtonProps) {
  return <button className={cn(buttonClass(variant, size), className)} disabled={disabled || loading} {...props}>{loading && <Spinner />}{children}</button>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('min-h-10 w-full rounded-lg border border-line bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 hover:border-slate-600 focus:border-indigo-400', className)} {...props} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('min-h-24 w-full resize-y rounded-lg border border-line bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 hover:border-slate-600 focus:border-indigo-400', className)} {...props} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn('min-h-10 w-full rounded-lg border border-line bg-slate-950/70 px-3 py-2 text-sm text-slate-100 hover:border-slate-600 focus:border-indigo-400', className)} {...props} />;
});

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('rounded-xl border border-line bg-panel shadow-panel', className)} {...props} />; }
export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) { return <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide', className)} {...props} />; }

const statusStyle: Record<Task['status'], string> = { TODO: 'border-slate-600/70 bg-slate-800/80 text-slate-300', IN_PROGRESS: 'border-sky-700/60 bg-sky-950/60 text-sky-300', DONE: 'border-emerald-700/60 bg-emerald-950/60 text-emerald-300' };
const priorityStyle: Record<Task['priority'], string> = { LOW: 'border-slate-700 bg-slate-900 text-slate-400', MEDIUM: 'border-amber-700/60 bg-amber-950/50 text-amber-300', HIGH: 'border-rose-700/60 bg-rose-950/50 text-rose-300' };
export const statusLabel: Record<Task['status'], string> = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
export function StatusBadge({ status }: { status: Task['status'] }) { return <Badge className={statusStyle[status]}><span className="h-1.5 w-1.5 rounded-full bg-current" />{statusLabel[status]}</Badge>; }
export function PriorityBadge({ priority }: { priority: Task['priority'] }) { return <Badge className={priorityStyle[priority]}>{priority.charAt(0) + priority.slice(1).toLowerCase()}</Badge>; }

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
  return <span title={name} aria-label={name} className={cn('inline-flex shrink-0 items-center justify-center rounded-full border border-indigo-400/25 bg-indigo-500/15 font-semibold text-indigo-200', size === 'sm' ? 'h-6 w-6 text-[10px]' : size === 'lg' ? 'h-11 w-11 text-sm' : 'h-8 w-8 text-xs')}>{initials}</span>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div className="min-w-0">{eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">{eyebrow}</div>}<h1 className="truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>{description && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>}</div>{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}</div>;
}
export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) { return <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-100">{title}</h2>{description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}</div>{action}</div>; }

export function Spinner() { return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />; }
export function Skeleton({ className }: { className?: string }) { return <div className={cn('animate-pulse rounded-md bg-slate-800', className)} />; }
export function PageSkeleton({ cards = 4 }: { cards?: number }) { return <div aria-label="Loading" role="status"><div className="mb-6 space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72 max-w-full" /></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: cards }, (_, i) => <Card key={i} className="p-5"><Skeleton className="h-4 w-24" /><Skeleton className="mt-4 h-9 w-16" /></Card>)}</div></div>; }

export function EmptyState({ icon: Icon = Icons.Folder, title, description, action, compact = false }: { icon?: (props: IconProps) => React.ReactNode; title: string; description: string; action?: React.ReactNode; compact?: boolean }) {
  return <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'rounded-xl border border-dashed border-line bg-panel/50 px-6 py-14')}><div className="mb-3 grid h-10 w-10 place-items-center rounded-lg border border-line bg-slate-900 text-slate-400"><Icon className="h-5 w-5" /></div><h3 className="font-semibold text-slate-200">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}
export function ErrorState({ title, message, onRetry, compact = false }: { title?: string; message?: string; onRetry?: () => void; compact?: boolean }) { return <div role="alert" className={cn('border border-rose-900/60 bg-rose-950/25', compact ? 'rounded-lg p-3' : 'rounded-xl p-5')}><div className="flex items-start gap-3"><Icons.Warning className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" /><div className="min-w-0 flex-1"><h3 className="font-semibold text-rose-200">{title ?? 'Something went wrong'}</h3>{message && <p className="mt-1 text-sm text-rose-300/80">{message}</p>}{onRetry && <Button className="mt-3" size="sm" variant="secondary" onClick={onRetry}><Icons.Refresh className="h-3.5 w-3.5" />Retry</Button>}</div></div></div>; }

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: React.ReactNode }) { return <div><label className="label" htmlFor={htmlFor}>{label}</label>{children}{hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}{error && <p className="mt-1.5 text-xs text-rose-300" id={`${htmlFor}-error`}>{error}</p>}</div>; }

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', busy, onConfirm, onClose }: { open: boolean; title: string; description: string; confirmLabel?: string; busy?: boolean; onConfirm: () => void | Promise<void>; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, busy, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}><div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" className="w-full max-w-md rounded-xl border border-line bg-elevated p-5 shadow-2xl"><div className="mb-4 flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-300"><Icons.Warning className="h-5 w-5" /></div><div><h2 id="confirm-title" className="font-semibold text-white">{title}</h2><p id="confirm-description" className="mt-1 text-sm leading-6 text-slate-400">{description}</p></div></div><div className="flex justify-end gap-2"><Button autoFocus variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button><Button variant="danger" loading={busy} onClick={onConfirm}>{busy ? `${confirmLabel.replace(/e$/, '')}ing...` : confirmLabel}</Button></div></div></div>;
}
