import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { LogOut, ShieldCheck } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * Top-bar profile dropdown — replaces the separate "My data & privacy" icon and the
 * sidebar-footer logout button with one place, following the same toggled-panel pattern
 * `NotificationBell` already uses.
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
        navigate('/login');
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label="Account menu"
                className={cn('flex items-center rounded-full', className)}
            >
                <Avatar name={user.name} />
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
                        <ShieldCheck className="size-4" aria-hidden="true" />
                        My data & privacy
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger-600 hover:bg-surface-50"
                    >
                        <LogOut className="size-4" aria-hidden="true" />
                        Log out
                    </button>
                </div>
            )}
        </div>
    );
}
