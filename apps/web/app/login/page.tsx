'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { Button, Card, Field, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('alice@taskflow.dev');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!email.trim()) return setError('Enter your email address.');
    if (!password) return setError('Enter your password.');
    setLoading(true);
    try { await login(email.trim(), password); router.push('/dashboard'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to sign in.'); }
    finally { setLoading(false); }
  }

  return <main className="grid min-h-screen place-items-center p-5"><div className="w-full max-w-md"><div className="mb-6 text-center"><Link href="/login" className="inline-flex items-center gap-2 text-xl font-bold text-white"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 text-sm shadow-lg shadow-indigo-950">TF</span>Task<span className="-ml-2 text-indigo-400">Flow</span></Link><p className="mt-3 text-sm text-slate-500">A focused workspace for collaborative delivery.</p></div><Card className="p-6 sm:p-8"><div className="mb-6"><h1 className="text-2xl font-bold tracking-tight text-white">Welcome back</h1><p className="mt-1 text-sm text-slate-400">Sign in to continue to your workspace.</p></div><form onSubmit={submit} className="space-y-4" noValidate><Field label="Email address" htmlFor="email"><Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required /></Field><Field label="Password" htmlFor="password"><Input id="password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></Field>{error && <div role="alert" className="rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2.5 text-sm text-rose-200">{error}</div>}<Button className="w-full" loading={loading} type="submit">{loading ? 'Signing in...' : 'Sign in'}</Button></form><p className="mt-6 text-center text-sm text-slate-500">New to TaskFlow? <Link className="font-medium text-indigo-400 hover:text-indigo-300" href="/signup">Create an account</Link></p></Card></div></main>;
}
