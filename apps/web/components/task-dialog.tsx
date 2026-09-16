'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import type { Comment, Membership, Task } from '@/lib/types';
import { useToast } from './toast-provider';
import { Avatar, Button, ConfirmDialog, EmptyState, Field, Input, PriorityBadge, Select, Spinner, StatusBadge, Textarea } from './ui';
import { Icons } from './icons';
import { relativeTime } from './activity-item';

type Props = {
  task: Task | null;
  members: Membership[];
  projectId: string;
  onClose: () => void;
  onChange: (taskId: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
};

export function TaskDialog({ task, members, projectId, onClose, onChange, onDelete }: Props) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('MEDIUM');
  const [status, setStatus] = useState<Task['status']>('TODO');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title); setDescription(task.description ?? ''); setPriority(task.priority); setStatus(task.status); setDueDate(task.dueDate?.slice(0, 10) ?? ''); setAssignee(task.assigneeId ?? ''); setError(''); setComment(''); setCommentError('');
    setCommentsLoading(true);
    apiFetch<Comment[]>(`/projects/${projectId}/tasks/${task.id}/comments`).then(setComments).catch((caught) => setCommentError(caught instanceof Error ? caught.message : 'Unable to load comments.')).finally(() => setCommentsLoading(false));
  }, [task, projectId]);

  useEffect(() => {
    if (!task) return;
    const socket = getSocket();
    const receive = (payload: { taskId: string; comment: Comment }) => { if (payload.taskId === task.id) setComments((current) => current.some((item) => item.id === payload.comment.id) ? current : [...current, payload.comment]); };
    socket.on('comment:created', receive);
    return () => { socket.off('comment:created', receive); };
  }, [task]);

  useEffect(() => {
    if (!task || confirmDelete) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [task, confirmDelete, saving, onClose]);

  if (!task) return null;
  const currentTask = task;

  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!title.trim()) return setError('Title is required.');
    const originalDate = currentTask.dueDate?.slice(0, 10) ?? '';
    if (dueDate && dueDate !== originalDate && new Date(`${dueDate}T23:59:59`).getTime() < Date.now()) return setError('Due date cannot be in the past.');
    setSaving(true);
    try { await onChange(currentTask.id, { title: title.trim(), description: description.trim() || null, priority, status, dueDate: dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : null, assigneeId: assignee || null }); toast('Task updated'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update the task.'); }
    finally { setSaving(false); }
  }

  async function addComment(event: FormEvent) {
    event.preventDefault(); setCommentError('');
    if (!comment.trim()) return setCommentError('Comment cannot be empty.');
    setCommentBusy(true);
    try { const created = await apiFetch<Comment>(`/projects/${projectId}/tasks/${currentTask.id}/comments`, { method: 'POST', body: JSON.stringify({ content: comment.trim() }) }); setComments((current) => current.some((item) => item.id === created.id) ? current : [...current, created]); setComment(''); toast('Comment added'); }
    catch (caught) { setCommentError(caught instanceof Error ? caught.message : 'Unable to add the comment.'); }
    finally { setCommentBusy(false); }
  }

  async function remove() {
    setDeleting(true);
    try { await onDelete(currentTask.id); toast('Task deleted'); setConfirmDelete(false); onClose(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to delete the task.'); setConfirmDelete(false); }
    finally { setDeleting(false); }
  }

  return <><div className="fixed inset-0 z-40 flex justify-end bg-black/70" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="task-title" className="h-full w-full max-w-2xl overflow-y-auto border-l border-line bg-elevated shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-elevated/95 px-5 py-4 backdrop-blur"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Task details</p><h2 id="task-title" className="mt-0.5 truncate font-semibold text-white">{task.title}</h2></div><Button variant="ghost" size="sm" aria-label="Close task details" onClick={onClose}><Icons.Close className="h-5 w-5" /></Button></header><div className="space-y-6 p-5 sm:p-6"><form onSubmit={save} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Title" htmlFor="edit-title"><Input id="edit-title" value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} /></Field></div><Field label="Status" htmlFor="edit-status"><Select id="edit-status" value={status} onChange={(event) => setStatus(event.target.value as Task['status'])}><option value="TODO">To Do</option><option value="IN_PROGRESS">In Progress</option><option value="DONE">Done</option></Select></Field><Field label="Priority" htmlFor="edit-priority"><Select id="edit-priority" value={priority} onChange={(event) => setPriority(event.target.value as Task['priority'])}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></Select></Field><Field label="Assignee" htmlFor="edit-assignee"><Select id="edit-assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)}><option value="">Unassigned</option>{members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</Select></Field><Field label="Due date" htmlFor="edit-due"><Input id="edit-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field><div className="sm:col-span-2"><Field label="Description" htmlFor="edit-description"><Textarea id="edit-description" className="min-h-32" value={description} maxLength={5000} placeholder="Add context, acceptance criteria, or useful links..." onChange={(event) => setDescription(event.target.value)} /></Field></div></div>{error && <p className="error" role="alert">{error}</p>}<div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"><Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}><Icons.Trash className="h-4 w-4" />Delete task</Button><Button type="submit" loading={saving}>{saving ? 'Saving...' : 'Save changes'}</Button></div></form><section className="border-t border-line pt-6"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold text-white">Comments</h3><p className="text-xs text-slate-500">Discuss this task with the project team.</p></div><span className="text-xs text-slate-500">{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span></div>{commentsLoading ? <div className="flex items-center gap-2 py-6 text-sm text-slate-500"><Spinner />Loading comments...</div> : comments.length ? <div className="mb-4 divide-y divide-line">{comments.map((item) => <div className="flex gap-3 py-4" key={item.id}><Avatar name={item.author.name} /><div className="min-w-0"><div className="flex flex-wrap items-baseline gap-x-2"><span className="text-sm font-semibold text-slate-200">{item.author.name}</span><time className="text-[11px] text-slate-600" dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()}>{relativeTime(item.createdAt)}</time></div><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">{item.content}</p></div></div>)}</div> : <EmptyState compact icon={Icons.Comment} title="No comments yet" description="Start the conversation with a helpful update or question." />}<form onSubmit={addComment} className="space-y-2"><label className="label" htmlFor="new-comment">Add a comment</label><Textarea id="new-comment" value={comment} maxLength={2000} placeholder="Write a comment..." onChange={(event) => setComment(event.target.value)} />{commentError && <p className="error" role="alert">{commentError}</p>}<div className="flex justify-end"><Button type="submit" loading={commentBusy}>{commentBusy ? 'Posting...' : 'Post comment'}</Button></div></form></section><div className="border-t border-line pt-5"><h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Metadata</h3><div className="flex flex-wrap gap-2"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} />{task.createdBy && <span className="text-xs text-slate-500">Created by {task.createdBy.name}</span>}</div></div></div></section></div><ConfirmDialog open={confirmDelete} title={`Delete “${task.title}”?`} description="This permanently removes the task, its comments, and related board data. This action cannot be undone." confirmLabel="Delete" busy={deleting} onClose={() => setConfirmDelete(false)} onConfirm={remove} /></>;
}
