'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logout, getAccessToken } from '@/lib/auth';
import { useAuth } from './auth-provider';
import { disconnectSocket, getSocket } from '@/lib/socket';
import { Avatar, Button, cn } from './ui';
import { Icons } from './icons';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: Icons.Dashboard },
  { href: '/projects', label: 'Projects', icon: Icons.Folder },
  { href: '/assigned', label: 'Assigned to me', icon: Icons.User },
];

function LiveStatus() {
  const [status, setStatus] = useState<'live' | 'connecting' | 'offline'>('connecting');
  useEffect(() => {
    const socket = getSocket();
    socket.auth = { token: getAccessToken() };
    const connected = () => setStatus('live');
    const connecting = () => setStatus('connecting');
    const offline = () => setStatus('offline');
    socket.on('connect', connected);
    socket.io.on('reconnect_attempt', connecting);
    socket.on('disconnect', offline);
    socket.on('connect_error', offline);
    if (!socket.connected) socket.connect(); else connected();
    return () => {
      socket.off('connect', connected);
      socket.io.off('reconnect_attempt', connecting);
      socket.off('disconnect', offline);
      socket.off('connect_error', offline);
    };
  }, []);
  const label = status === 'live' ? 'Live' : status === 'connecting' ? 'Reconnecting' : 'Offline';
  return <div className="hidden items-center gap-1.5 rounded-full border border-line bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-400 sm:flex" title="Realtime connection status"><span className={cn('h-1.5 w-1.5 rounded-full', status === 'live' ? 'bg-emerald-400' : status === 'connecting' ? 'animate-pulse bg-amber-400' : 'bg-slate-500')} />{label}</div>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!ready) return <main className="grid min-h-screen place-items-center"><div className="flex items-center gap-3 text-sm text-slate-400"><span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-r-transparent" />Preparing your workspace...</div></main>;
  if (!user) return <main className="grid min-h-screen place-items-center p-6"><div className="card max-w-md text-center"><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300"><Icons.Warning className="h-6 w-6" /></div><h1 className="text-xl font-bold">Authentication required</h1><p className="mt-2 text-sm text-slate-400">Your session has ended. Sign in to continue.</p><Link className="btn mt-5" href="/login">Go to sign in</Link></div></main>;

  async function signOut() {
    setLoggingOut(true);
    disconnectSocket();
    await logout();
    router.push('/login');
  }

  return <div className="min-h-screen">
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-5 px-4 sm:px-6">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2 font-bold tracking-tight text-white"><span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500 text-sm shadow-lg shadow-indigo-950">TF</span><span className="hidden sm:block">Task<span className="text-indigo-400">Flow</span></span></Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Main navigation">{links.map(({ href, label, icon: Icon }) => { const active = pathname === href || (href === '/projects' && pathname.startsWith('/projects/')); return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium', active ? 'bg-indigo-500/12 text-indigo-200' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100')}><Icon className="h-4 w-4" />{label}</Link>; })}</nav>
        <div className="ml-auto flex items-center gap-2"><LiveStatus /><div className="hidden items-center gap-2 border-l border-line pl-3 lg:flex"><Avatar name={user.name} /><div className="max-w-36"><div className="truncate text-xs font-semibold text-slate-200">{user.name}</div><div className="truncate text-[11px] text-slate-500">{user.email}</div></div></div><Button aria-label="Log out" title="Log out" variant="ghost" size="sm" loading={loggingOut} onClick={signOut}><Icons.Logout className="h-4 w-4" /><span className="hidden xl:inline">Logout</span></Button><Button aria-label="Toggle navigation" aria-expanded={menuOpen} variant="secondary" size="sm" className="md:hidden" onClick={() => setMenuOpen((open) => !open)}><Icons.Menu className="h-4 w-4" /></Button></div>
      </div>
      {menuOpen && <nav className="grid gap-1 border-t border-line p-3 md:hidden" aria-label="Mobile navigation">{links.map(({ href, label, icon: Icon }) => { const active = pathname === href || (href === '/projects' && pathname.startsWith('/projects/')); return <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium', active ? 'bg-indigo-500/12 text-indigo-200' : 'text-slate-400 hover:bg-slate-900')}><Icon className="h-4 w-4" />{label}</Link>; })}</nav>}
    </header>
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
  </div>;
}
