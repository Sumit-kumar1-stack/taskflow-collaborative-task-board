import './globals.css';
import { AuthProvider } from '@/components/auth-provider';
import { ToastProvider } from '@/components/toast-provider';

export const metadata = { title: { default: 'TaskFlow', template: '%s | TaskFlow' }, description: 'Collaborative task management, made clear.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider></body></html>;
}
