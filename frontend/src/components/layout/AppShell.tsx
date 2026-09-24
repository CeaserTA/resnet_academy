import { type ReactNode, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import * as Dialog from '@radix-ui/react-dialog';
import {
    BookOpen,
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    CreditCard,
    FileCheck,
    GraduationCap,
    LayoutDashboard,
    LifeBuoy,
    Menu,
    MessagesSquare,
    MessageSquare,
    Search,
    Star,
    Users,
    ArrowRight,
    X,
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
    /** Shorter label for the phone bottom bar, when `label` won't fit. */
    short?: string;
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
            { to: '/admin/cohorts', label: 'Cohorts', icon: CalendarRange },
            { to: '/admin/courses', label: 'Courses', icon: BookOpen },
            ...communicationItems,
            { to: '/admin/applications', label: 'Applications', icon: FileCheck, divider: true },
            { to: '/admin/enrolments', label: 'Enrolments', icon: Users },
            { to: '/admin/transfer-requests', label: 'Transfer Requests', short: 'Transfers', icon: ArrowRight },
            { to: '/admin/reviews', label: 'Reviews', icon: Star },
            { to: '/admin/payments', label: 'Payments', icon: CreditCard },
            { to: '/admin/users', label: 'Team', icon: Users, divider: true },
            { to: '/admin/audit-log', label: 'Audit log', icon: ClipboardList },
        ];
    }

    if (role === 'instructor') {
        return [
            { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
            { to: '/admin/cohorts', label: 'Cohorts', icon: CalendarRange },
            { to: '/admin/courses', label: 'My courses', icon: BookOpen },
            ...communicationItems,
            { to: '/admin/applications', label: 'Applications', icon: FileCheck, divider: true },
            { to: '/admin/enrolments', label: 'Enrolments', icon: Users },
        ];
    }

    return [
        { to: '/dashboard', label: 'My courses', icon: LayoutDashboard, end: true },
        { to: '/forums', label: 'Forums', icon: MessagesSquare },
        { to: '/#courses', label: 'Browse catalogue', short: 'Browse', icon: BookOpen },
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

// ─── Phone bottom bar ─────────────────────────────────────────────────────────

const BAR_SLOTS = 5;

/**
 * Below `lg` the sidebar is hidden, so every nav item must stay reachable from here. Up to
 * five items fit; beyond that the bar shows four plus "More", which opens a bottom sheet
 * with the rest (admins have ~12 destinations).
 */
function MobileNav({ items }: { items: NavItem[] }) {
    const [moreOpen, setMoreOpen] = useState(false);
    const location = useLocation();
    const overflowing = items.length > BAR_SLOTS;
    const barItems = overflowing ? items.slice(0, BAR_SLOTS - 1) : items;
    const moreItems = overflowing ? items.slice(BAR_SLOTS - 1) : [];
    const moreActive = moreItems.some(({ to }) => location.pathname.startsWith(to.split('#')[0]) && to !== '/#courses');

    const slotClass = (active: boolean) =>
        cn(
            'flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1 text-[11px] font-medium',
            active ? 'text-blue-600' : 'text-ink-600',
        );

    return (
        <>
            <nav
                className="fixed inset-x-0 bottom-0 z-10 flex items-stretch border-t border-surface-100 bg-surface-0 pb-[env(safe-area-inset-bottom)] pt-1.5 lg:hidden"
                aria-label="Primary"
            >
                {barItems.map(({ to, label, short, icon: Icon, end }) => (
                    <NavLink key={to} to={to} end={end} className={({ isActive }) => slotClass(isActive)}>
                        <Icon className="size-5" aria-hidden="true" />
                        <span className="w-full truncate text-center">{short ?? label}</span>
                    </NavLink>
                ))}
                {overflowing && (
                    <button
                        type="button"
                        onClick={() => setMoreOpen(true)}
                        aria-haspopup="dialog"
                        aria-expanded={moreOpen}
                        className={slotClass(moreActive)}
                    >
                        <Menu className="size-5" aria-hidden="true" />
                        <span>More</span>
                    </button>
                )}
            </nav>

            <Dialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay
                        data-reduce-motion
                        className="fixed inset-0 z-40 bg-navy/40 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in lg:hidden"
                    />
                    <Dialog.Content
                        data-reduce-motion
                        className="fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-surface-0 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in lg:hidden"
                    >
                        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-100" aria-hidden="true" />
                        <div className="mb-3 flex items-center justify-between">
                            <Dialog.Title className="text-base text-ink-900">More</Dialog.Title>
                            <Dialog.Close
                                aria-label="Close"
                                className="rounded-lg p-1.5 text-ink-600 hover:bg-surface-100 hover:text-ink-900"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </Dialog.Close>
                        </div>
                        <Dialog.Description className="sr-only">Other sections of the app</Dialog.Description>
                        <div className="grid grid-cols-3 gap-2">
                            {moreItems.map(({ to, label, icon: Icon, end }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    end={end}
                                    onClick={() => setMoreOpen(false)}
                                    className={({ isActive }) =>
                                        cn(
                                            'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-medium transition-colors',
                                            isActive
                                                ? 'border-blue-100 bg-blue-50 text-blue-700'
                                                : 'border-surface-100 text-ink-900 hover:bg-surface-50',
                                        )
                                    }
                                >
                                    <Icon className="size-5" aria-hidden="true" />
                                    {label}
                                </NavLink>
                            ))}
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
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

                <MobileNav items={items} />
            </div>
        </div>
    );
}
