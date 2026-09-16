'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { getUser, refreshSession, subscribeAuth } from '@/lib/auth';
import type { User } from '@/lib/types';

const AuthContext = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getUser());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const unsub = subscribeAuth(() => setUser(getUser()));
    refreshSession().finally(() => setReady(true));
    return unsub;
  }, []);
  return <AuthContext.Provider value={{ user, ready }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
