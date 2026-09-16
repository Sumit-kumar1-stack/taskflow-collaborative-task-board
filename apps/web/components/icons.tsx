import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}

export const Icons = {
  Activity: (props: IconProps) => <Icon {...props}><path d="M3 12h4l2.5-7 5 14 2.5-7h4" /></Icon>,
  ArrowLeft: (props: IconProps) => <Icon {...props}><path d="m15 18-6-6 6-6" /></Icon>,
  ArrowRight: (props: IconProps) => <Icon {...props}><path d="m9 18 6-6-6-6" /></Icon>,
  Board: (props: IconProps) => <Icon {...props}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></Icon>,
  Check: (props: IconProps) => <Icon {...props}><path d="m5 12 4 4L19 6" /></Icon>,
  ChevronDown: (props: IconProps) => <Icon {...props}><path d="m6 9 6 6 6-6" /></Icon>,
  Clock: (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>,
  Close: (props: IconProps) => <Icon {...props}><path d="m6 6 12 12M18 6 6 18" /></Icon>,
  Comment: (props: IconProps) => <Icon {...props}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /></Icon>,
  Dashboard: (props: IconProps) => <Icon {...props}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Icon>,
  Edit: (props: IconProps) => <Icon {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></Icon>,
  Folder: (props: IconProps) => <Icon {...props}><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></Icon>,
  List: (props: IconProps) => <Icon {...props}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Icon>,
  Logout: (props: IconProps) => <Icon {...props}><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></Icon>,
  Menu: (props: IconProps) => <Icon {...props}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>,
  Plus: (props: IconProps) => <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>,
  Refresh: (props: IconProps) => <Icon {...props}><path d="M20 6v5h-5" /><path d="M19 15a8 8 0 1 1-1-8l2 4" /></Icon>,
  Search: (props: IconProps) => <Icon {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></Icon>,
  Trash: (props: IconProps) => <Icon {...props}><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></Icon>,
  User: (props: IconProps) => <Icon {...props}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Icon>,
  Users: (props: IconProps) => <Icon {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></Icon>,
  Warning: (props: IconProps) => <Icon {...props}><path d="M10.3 3.6 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></Icon>,
};
