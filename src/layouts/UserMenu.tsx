import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronsUpDown, KeyRound, LogOut, Palette, UserRound } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/menus';
import { Avatar } from '@/components/ui/primitives';
import { useAdminProfile } from '@/features/account/api';
import { useSession } from '@/lib/auth/session';
import { signOut } from '@/lib/auth/auth-service';
import { cn } from '@/lib/utils';

export function useAdminDisplayName() {
  const user = useSession((s) => s.user);
  const { data: profile } = useAdminProfile();
  return profile?.fullName || user?.email || user?.phone || 'Administrator';
}

export function UserMenu({ compact, align = 'start' }: { compact?: boolean; align?: 'start' | 'end' }) {
  const user = useSession((s) => s.user);
  const { data: profile } = useAdminProfile();
  const name = useAdminDisplayName();
  const navigate = useNavigate();
  const client = useQueryClient();

  const logout = async () => {
    await signOut();
    client.clear();
    navigate('/login', { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg p-1.5 text-left outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-primary/30',
          compact ? 'justify-center' : 'flex-1',
        )}
        aria-label="Account menu"
      >
        <Avatar name={name} className="size-8 text-sm" />
        {!compact && (
          <>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13px] font-medium">{name}</div>
              <div className="truncate text-[11px] text-muted-foreground">{profile?.title || user?.email || 'Admin'}</div>
            </div>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={compact ? 'right' : 'top'} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-medium text-foreground">{name}</div>
          <div className="truncate text-xs">{user?.email ?? user?.phone}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/settings/profile')}>
          <UserRound /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/settings/security')}>
          <KeyRound /> Security
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/settings/appearance')}>
          <Palette /> Appearance
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => void logout()}>
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
