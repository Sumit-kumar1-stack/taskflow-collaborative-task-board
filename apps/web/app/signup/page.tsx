'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signup } from '@/lib/auth';
import { Button, Card, Field, Input } from '@/components/ui';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (name.trim().length < 2) return setError('Name must be at least 2 characters.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) return setError('Password must include 8+ characters, uppercase, lowercase, and a number.');
    setLoading(true);
    try { await signup(name.trim(), email.trim(), password); router.push('/dashboard'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to create your account.'); }
    finally { setLoading(false); }
  }

  return <main className="grid min-h-screen place-items-center p-5"><div className="w-full max-w-md"><div className="mb-6 text-center"><Link href="/signup" className="inline-flex items-center gap-2 text-xl font-bold text-white"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 text-sm shadow-lg shadow-indigo-950">TF</span>Task<span className="-ml-2 text-indigo-400">Flow</span></Link></div><Card className="p-6 sm:p-8"><div className="mb-6"><h1 className="text-2xl font-bold tracking-tight text-white">Create your account</h1><p className="mt-1 text-sm text-slate-400">Start organizing work with your team.</p></div><form onSubmit={submit} className="space-y-4" noValidate><Field label="Full name" htmlFor="name"><Input id="name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></Field><Field label="Email address" htmlFor="email"><Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required /></Field><Field label="Password" htmlFor="password" hint="Use 8+ characters with uppercase, lowercase, and a number."><Input id="password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" required /></Field>{error && <div role="alert" className="rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2.5 text-sm text-rose-200">{error}</div>}<Button className="w-full" loading={loading} type="submit">{loading ? 'Creating account...' : 'Create account'}</Button></form><p className="mt-6 text-center text-sm text-slate-500">Already registered? <Link className="font-medium text-indigo-400 hover:text-indigo-300" href="/login">Sign in</Link></p></Card></div></main>;
}
