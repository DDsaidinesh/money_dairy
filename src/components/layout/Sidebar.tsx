import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Wallet,
  Settings,
  IndianRupee,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/categories', label: 'Categories', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border/50 bg-sidebar">
      <div className="flex items-center gap-2.5 px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/10">
          <IndianRupee className="h-4 w-4 text-foreground" />
        </div>
        <span className="text-lg font-display font-semibold tracking-tight">Money Tracker</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
              )
            }
          >
            <link.icon className="h-5 w-5 shrink-0" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border/50 px-3 py-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-foreground/10 text-foreground'
                : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
            )
          }
        >
          <Settings className="h-5 w-5 shrink-0" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
