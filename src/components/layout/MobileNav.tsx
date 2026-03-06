import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, BarChart3, Wallet, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  onAddClick: () => void;
}

const tabs = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/transactions', label: 'History', icon: Receipt },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
];

export default function MobileNav({ onAddClick }: MobileNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-border/50 bg-background/90 backdrop-blur-lg safe-bottom">
      <div className="grid h-full grid-cols-5 items-center">
        {tabs.slice(0, 2).map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )
            }
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </NavLink>
        ))}

        <div className="flex items-center justify-center">
          <button
            onClick={onAddClick}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {tabs.slice(2).map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )
            }
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
