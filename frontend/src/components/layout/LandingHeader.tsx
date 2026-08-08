import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { GraduationCap, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface LandingHeaderProps {
    onLoginClick: () => void;
    onSignupClick: () => void;
}

// ─── Sliding indicator state ──────────────────────────────────────────────────

interface IndicatorStyle {
    left: number;
    width: number;
    opacity: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LandingHeader({ onLoginClick, onSignupClick }: LandingHeaderProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [indicator, setIndicator] = useState<IndicatorStyle>({ left: 0, width: 0, opacity: 0 });

    const navRef = useRef<HTMLElement>(null);
    const location = useLocation();

    const navLinks = [
        { label: 'Home', to: '/' },
        { label: 'Browse Courses', to: '/courses' },
        { label: 'About', to: '/about' },
        { label: 'Contact', to: '/contact' },
    ];

    // ── Scroll shadow ──────────────────────────────────────────────────────────
    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY > 0;
            setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // ── Position the indicator under the active link on route change ───────────
    useEffect(() => {
        positionIndicatorOnActive();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    function getNavRect() {
        return navRef.current?.getBoundingClientRect() ?? null;
    }

    function positionIndicatorOnEl(el: HTMLElement) {
        const navRect = getNavRect();
        if (!navRect) return;
        const elRect = el.getBoundingClientRect();
        setIndicator({
            left: elRect.left - navRect.left,
            width: elRect.width,
            opacity: 1,
        });
    }

    function positionIndicatorOnActive() {
        if (!navRef.current) return;
        const activeEl = navRef.current.querySelector<HTMLElement>('[data-active="true"]');
        if (activeEl) {
            positionIndicatorOnEl(activeEl);
        } else {
            setIndicator((prev) => ({ ...prev, opacity: 0 }));
        }
    }

    function handleLinkMouseEnter(e: React.MouseEvent<HTMLAnchorElement>) {
        positionIndicatorOnEl(e.currentTarget);
    }

    function handleNavMouseLeave() {
        // Slide back to active link, or fade out if none
        positionIndicatorOnActive();
    }

    return (
        <header
            className={cn(
                'sticky top-0 z-50 w-full border-b bg-[#fafbfc] transition-all duration-200',
                isScrolled ? 'border-[#e8ecf1] shadow-sm backdrop-blur-md' : 'border-transparent',
            )}
        >
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

                {/* ── Logo ───────────────────────────────────────────────────── */}
                <Link
                    to="/"
                    className="flex items-center gap-2 font-display text-lg font-semibold text-blue-600"
                >
                    <GraduationCap className="size-6 text-blue-600" aria-hidden="true" />
                    <span className="hidden sm:inline">Resnet LMS</span>
                </Link>

                {/* ── Desktop pill nav ───────────────────────────────────────── */}
                <nav
                    ref={navRef}
                    onMouseLeave={handleNavMouseLeave}
                    className="relative hidden items-center rounded-full border border-[#e8ecf1] bg-white px-1.5 py-1 shadow-sm lg:flex"
                    aria-label="Main navigation"
                >
                    {/* Sliding indicator — sits behind the links */}
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-1 top-1 rounded-full bg-blue-50 transition-all duration-200 ease-out"
                        style={{
                            left: indicator.left,
                            width: indicator.width,
                            opacity: indicator.opacity,
                        }}
                    />

                    {navLinks.map(({ label, to }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            onMouseEnter={handleLinkMouseEnter}
                            data-active={
                                // react-router NavLink sets aria-current, but we use a data attr
                                // so we can query it easily in positionIndicatorOnActive()
                                location.pathname === to ||
                                    (to !== '/' && location.pathname.startsWith(to))
                                    ? 'true'
                                    : 'false'
                            }
                            className={({ isActive }) =>
                                cn(
                                    'relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150',
                                    isActive ? 'text-blue-700' : 'text-[#475569] hover:text-blue-700',
                                )
                            }
                        >
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* ── Desktop auth buttons ───────────────────────────────────── */}
                <div className="hidden gap-3 lg:flex">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900"
                        onClick={onLoginClick}
                    >
                        Log in
                    </Button>
                    <Button variant="primary" size="sm" onClick={onSignupClick}>
                        Sign up
                    </Button>
                </div>

                {/* ── Mobile: sign up + hamburger ────────────────────────────── */}
                <div className="flex items-center gap-2 lg:hidden">
                    <Button variant="primary" size="sm" onClick={onSignupClick}>
                        Sign up
                    </Button>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="rounded-md p-2 text-[#475569] hover:bg-[#f1f5f9]"
                        aria-label="Toggle menu"
                        aria-expanded={mobileMenuOpen}
                    >
                        {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                    </button>
                </div>
            </div>

            {/* ── Mobile menu ────────────────────────────────────────────────── */}
            {mobileMenuOpen && (
                <div className="border-t border-[#e8ecf1] bg-white px-4 py-4 sm:px-6 lg:hidden">
                    <nav className="flex flex-col gap-1">
                        {navLinks.map(({ label, to }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={to === '/'}
                                onClick={() => setMobileMenuOpen(false)}
                                className={({ isActive }) =>
                                    cn(
                                        'block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a]',
                                        isActive ? 'text-blue-700' : 'text-[#475569]',
                                    )
                                }
                            >
                                {label}
                            </NavLink>
                        ))}
                        <div className="mt-2 border-t border-[#e8ecf1] pt-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => { onLoginClick(); setMobileMenuOpen(false); }}
                            >
                                Log in
                            </Button>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
