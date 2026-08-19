import { type ReactNode, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
    to: string;
    label: string;
    icon: LucideIcon;
    end?: boolean;
    /** Optional divider line rendered ABOVE this item */
    divider?: boolean;
}

// ─── Nav config per role ──────────────────────────────────────────────────────

const communicationItems: NavItem[] = [
    { to: '/messages', label: 'Messages', icon: MessageSquare, divider: true },
    { to: '/tickets', label: 'Support', icon: LifeBuoy },
];

function navItemsForRole(role: string): NavItem[] {
    if (role === 'admin') {
        return [
            { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
            { to: '/admin/courses', label: 'Courses', icon: BookOpen },
            ...communicationItems,
            { to: '/admin/applications', label: 'Applications', icon: FileCheck, divider: true },
            { to: '/admin/enrolments', label: 'Enrolments', icon: Users },
            { to: '/admin/reviews', label: 'Reviews', icon: Star },
            { to: '/admin/payments', label: 'Payments', icon: CreditCard },
            { to: '/admin/users', label: 'Team', icon: Users, divider: true },
            { to: '/admin/audit-log', label: 'Audit log', icon: ClipboardList },
        ];
    }

    if (role === 'instructor') {
        return [
            { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
            { to: '/admin/courses', label: 'My courses', icon: BookOpen },
            ...communicationItems,
            { to: '/admin/applications', label: 'Applications', icon: FileCheck, divider: true },
            { to: '/admin/enrolments', label: 'Enrolments', icon: Users },
        ];
    }

    return [
        { to: '/dashboard', label: 'My courses', icon: LayoutDashboard, end: true },
        { to: '/forums', label: 'Forums', icon: MessagesSquare },
        { to: '/#courses', label: 'Browse catalogue', icon: BookOpen },
        ...communicationItems,
    ];
}

// ─── Sidebar nav links ────────────────────────────────────────────────────────

function NavLinks({
    items,
    collapsed,
    onNavigate,
}: {
    items: NavItem[];
    collapsed: boolean;
    onNavigate?: () => void;
}) {
    return (
        <>
            {items.map(({ to, label, icon: Icon, end, divider }) => (
                <div key={to}>
                    {divider && (
                        <div className="mx-3 my-2 border-t border-white/10" aria-hidden="true" />
                    )}
                    <NavLink
                        to={to}
                        end={end}
                        onClick={onNavigate}
                        title={collapsed ? label : undefined}
                        className={({ isActive }) =>
                            cn(
                                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                                collapsed ? 'justify-center px-2' : '',
                                isActive
                                    ? 'bg-white/15 text-white shadow-sm'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                            )
                        }
                    >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        {!collapsed && <span>{label}</span>}
                    </NavLink>
                </div>
            ))}
        </>
    );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar() {
    const header = usePageHeaderValue();
    const search = usePageSearchValue();

    return (
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-surface-100 bg-surface-0 px-3 py-2 sm:px-4">
            {header ? (
                <div className="min-w-0 shrink-0">
                    <h1 className="text-base font-semibold text-ink-900">{header.title}</h1>
                    {header.subtitle && (
                        <p className="text-xs text-ink-600">{header.subtitle}</p>
                    )}
                </div>
            ) : (
                <Link
                    to="/dashboard"
                    className="flex shrink-0 items-center gap-2 font-display font-semibold text-blue-600"
                >
                    <GraduationCap className="size-5" aria-hidden="true" />
                    Resnet Academy
                </Link>
            )}

            <div className="flex flex-1 items-center justify-end gap-2">
                {search && (
                    <div className="relative w-full max-w-56">
                        <Search
                            className="absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-ink-600"
                            aria-hidden="true"
                        />
                        <input
                            value={search.value}
                            onChange={(e) => search.onChange(e.target.value)}
                            placeholder={search.placeholder}
                            aria-label={search.placeholder ?? 'Search'}
                            className="w-full rounded-lg border border-surface-100 bg-surface-50 py-1.5 pl-8 pr-3 text-sm text-ink-900 transition focus-visible:bg-surface-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        />
                    </div>
                )}

                <div className="flex shrink-0 items-center gap-0.5">
                    <NotificationBell className="text-ink-600 hover:bg-surface-100" />
                    <ProfileMenu />
                </div>
            </div>
        </header>
    );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function AppShell(): ReactNode {
    const { user } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    if (!user) return null;

    const items = navItemsForRole(user.role);
    const sidebarWidth = collapsed ? 'w-16' : 'w-60';

    return (
        <div className="flex h-screen overflow-hidden bg-surface-50">

            {/* ── Desktop sidebar ──────────────────────────────────────────── */}
            <aside
                className={cn(
                    'hidden flex-col overflow-hidden bg-blue-700 transition-all duration-200 lg:flex',
                    sidebarWidth,
                )}
            >
                {/* Logo */}
                <div
                    className={cn(
                        'flex h-14 shrink-0 items-center border-b border-white/10 px-4',
                        collapsed ? 'justify-center' : 'gap-2.5',
                    )}
                >
                    <GraduationCap className="size-5 shrink-0 text-white" aria-hidden="true" />
                    {!collapsed && (
                        <Link
                            to="/dashboard"
                            className="font-display text-sm font-semibold text-white"
                        >
                            Resnet Academy
                        </Link>
                    )}
                </div>

                {/* Nav links */}
                <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
                    <NavLinks items={items} collapsed={collapsed} />
                </nav>

                {/* Collapse toggle */}
                <div className="border-t border-white/10 p-2">
                    <button
                        onClick={() => setCollapsed((c) => !c)}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white',
                            collapsed ? 'justify-center px-2' : '',
                        )}
                    >
                        {collapsed ? (
                            <ChevronRight className="size-4" aria-hidden="true" />
                        ) : (
                            <>
                                <ChevronLeft className="size-4" aria-hidden="true" />
                                <span>Collapse</span>
                            </>
                        )}
                    </button>
                </div>
            </aside>

            {/* ── Main column ──────────────────────────────────────────────── */}
            <div className="flex min-w-0 flex-1 flex-col">
                <PageHeaderProvider>
                    <TopBar />

                    <main className="scrollbar-hide flex-1 overflow-y-auto p-4 pb-20 sm:p-5 lg:pb-5">
                        <Outlet />
                    </main>
                </PageHeaderProvider>

                {/* ── Mobile bottom nav ─────────────────────────────────────── */}
                <nav
                    className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-surface-100 bg-surface-0 py-2 lg:hidden"
                    aria-label="Primary"
                >
                    {items.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
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
                            <span className="max-w-12 truncate">{label}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>
        </div>
    );
}
