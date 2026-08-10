import { type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import {
    BookOpen,
    ClipboardList,
    CreditCard,
    FileCheck,
    GraduationCap,
    LayoutDashboard,
    LifeBuoy,
    MessagesSquare,
    MessageSquare,
    Search,
    Star,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { NotificationBell } from '@/features/communication/NotificationBell';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { PageHeaderProvider, usePageHeaderValue, usePageSearchValue } from '@/lib/pageHeader/PageHeaderContext';
import { cn } from '@/lib/utils';

interface NavItem {
    to: string;
    label: string;
    icon: LucideIcon;
    end?: boolean;
}

const communicationItems: NavItem[] = [
    { to: '/messages', label: 'Messages', icon: MessageSquare },
    { to: '/tickets', label: 'Support', icon: LifeBuoy },
];

function navItemsForRole(role: string): NavItem[] {
    if (role === 'admin') {
        return [
            { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
            { to: '/admin/courses', label: 'Courses', icon: BookOpen },
            ...communicationItems,
            { to: '/admin/applications', label: 'Applications', icon: FileCheck },
            { to: '/admin/reviews', label: 'Reviews', icon: Star },
            { to: '/admin/payments', label: 'Payments', icon: CreditCard },
            { to: '/admin/users', label: 'Team', icon: Users },
            { to: '/admin/audit-log', label: 'Audit log', icon: ClipboardList },
        ];
    }

    if (role === 'instructor') {
        return [
            { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
            { to: '/admin/courses', label: 'My courses', icon: BookOpen },
            ...communicationItems,
            { to: '/admin/applications', label: 'Applications', icon: FileCheck },
        ];
    }

    return [
        { to: '/dashboard', label: 'My courses', icon: LayoutDashboard, end: true },
        { to: '/forums', label: 'Forums', icon: MessagesSquare },
        { to: '/#courses', label: 'Browse catalogue', icon: BookOpen },
        ...communicationItems,
    ];
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
    return (
        <>
            {items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                        cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                                ? 'bg-blue-600 text-white'
                                : 'text-surface-0/80 hover:bg-blue-600/40 hover:text-surface-0',
                        )
                    }
                >
                    <Icon className="size-5" aria-hidden="true" />
                    {label}
                </NavLink>
            ))}
        </>
    );
}

function TopBar() {
    const header = usePageHeaderValue();
    const search = usePageSearchValue();

    return (
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-surface-100 bg-surface-0 px-3 py-2 sm:px-4">
            {header ? (
                <div className="min-w-0 shrink-0">
                    <h1 className="text-base font-semibold text-ink-900">{header.title}</h1>
                    {header.subtitle && <p className="text-xs text-ink-600">{header.subtitle}</p>}
                </div>
            ) : (
                <Link to="/dashboard" className="flex shrink-0 items-center gap-2 font-display font-semibold text-blue-600">
                    <GraduationCap className="size-5" aria-hidden="true" />
                    Resnet LMS
                </Link>
            )}

            <div className="flex flex-1 items-center justify-end gap-2">
                {search && (
                    <div className="relative w-full max-w-64">
                        <Search className="absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-ink-600" aria-hidden="true" />
                        <input
                            value={search.value}
                            onChange={(e) => search.onChange(e.target.value)}
                            placeholder={search.placeholder}
                            aria-label={search.placeholder ?? 'Search'}
                            className="w-full rounded-md border border-surface-100 bg-surface-0 py-1.5 pl-9 pr-3 text-sm text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        />
                    </div>
                )}

                <div className="flex shrink-0 items-center gap-1">
                    <NotificationBell className="text-ink-600 hover:bg-surface-100" />
                    <ProfileMenu />
                </div>
            </div>
        </header>
    );
}

export function AppShell(): ReactNode {
    const { user } = useAuth();

    if (!user) {
        return null;
    }

    const items = navItemsForRole(user.role);

    return (
        <div className="flex h-screen overflow-hidden">
            <aside className="hidden w-56 flex-col gap-0.5 overflow-y-auto bg-blue-700 p-3 lg:flex">
                <Link
                    to="/dashboard"
                    className="mb-3 flex items-center gap-2 px-2 font-display text-lg font-semibold text-surface-0"
                >
                    <GraduationCap className="size-6" aria-hidden="true" />
                    Resnet LMS
                </Link>

                <nav className="flex flex-1 flex-col gap-0.5">
                    <NavLinks items={items} />
                </nav>
            </aside>

            <div className="flex flex-1 flex-col">
                <PageHeaderProvider>
                    <TopBar />

                    <main className="flex-1 overflow-y-auto bg-surface-50 p-3 pb-16 sm:p-4 lg:pb-4">
                        <Outlet />
                    </main>
                </PageHeaderProvider>

                <nav
                    className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-surface-100 bg-surface-0 py-2 lg:hidden"
                    aria-label="Primary"
                >
                    {items.slice(0, 4).map(({ to, label, icon: Icon, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                cn(
                                    'flex flex-col items-center gap-0.5 px-2 text-xs font-medium',
                                    isActive ? 'text-blue-600' : 'text-ink-600',
                                )
                            }
                        >
                            <Icon className="size-5" aria-hidden="true" />
                            {label}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </div>
    );
}
