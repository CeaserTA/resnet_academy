import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronDown, LifeBuoy, LogOut, Pencil, Settings2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * Top-bar profile dropdown. "Account settings" jumps to the same /account page as "Edit
 * profile" — there's one unified profile page, not a separate settings screen — but scrolls to
 * its Security section via the #security hash (see AccountPage's scroll-into-view effect).
 */
export function ProfileMenu({ className }: { className?: string }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    if (!user) {
        return null;
    }

    const handleLogout = async () => {
        await logout();
        // Land on the public homepage after signing out — /login is only for intentional visits.
        navigate('/');
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label="Account menu"
                aria-expanded={isOpen}
                className={cn(
                    'flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-100',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
                    className,
                )}
            >
                <Avatar name={user.name} src={user.avatar_url} />
                <span className="hidden max-w-[8rem] truncate text-sm font-medium text-ink-900 sm:inline">{user.name}</span>
                <ChevronDown
                    className={cn('size-4 shrink-0 text-ink-600 transition-transform duration-200', isOpen && 'rotate-180')}
                    aria-hidden="true"
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-surface-100 bg-surface-0 py-1 shadow-lg">
                    <div className="border-b border-surface-100 px-3 py-2">
                        <p className="truncate text-sm font-medium text-ink-900">{user.name}</p>
                        <p className="truncate text-xs text-ink-600">{user.email}</p>
                    </div>

                    <Link
                        to="/account"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-ink-900 hover:bg-surface-50"
                    >
                        <Pencil className="size-4" aria-hidden="true" />
                        Edit profile
                    </Link>

                    <Link
                        to="/account#security"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-ink-900 hover:bg-surface-50"
                    >
                        <Settings2 className="size-4" aria-hidden="true" />
                        Account settings
                    </Link>

                    <Link
                        to="/tickets"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-ink-900 hover:bg-surface-50"
                    >
                        <LifeBuoy className="size-4" aria-hidden="true" />
                        Support
                    </Link>

                    <div className="my-1 border-t border-surface-100" />

                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger-600 hover:bg-surface-50"
                    >
                        <LogOut className="size-4" aria-hidden="true" />
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}
