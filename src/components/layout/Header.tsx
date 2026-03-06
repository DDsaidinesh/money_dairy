import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings, IndianRupee, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/use-profile';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function Header() {
  const { user, logout } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const [isLight, setIsLight] = useState(() => document.documentElement.classList.contains('light'));

  const initials = (profile?.name || user?.email || 'U')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const toggleTheme = useCallback(() => {
    const goLight = !isLight;
    setIsLight(goLight);
    document.documentElement.classList.toggle('light', goLight);
    document.documentElement.classList.toggle('dark', !goLight);
    localStorage.setItem('theme', goLight ? 'light' : 'dark');
  }, [isLight]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-background px-4">
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/10">
          <IndianRupee className="h-3.5 w-3.5" />
        </div>
        <span className="font-display font-semibold text-sm">Money Tracker</span>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-foreground/10 text-foreground font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{profile?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/accounts')}>
              <User className="mr-2 h-4 w-4" />
              Accounts
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
