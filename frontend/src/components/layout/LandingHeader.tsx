import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { GraduationCap, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface LandingHeaderProps {
    isAuthenticated?: boolean;
    onLoginClick: () => void;
    onSignupClick: () => void;
}

export function LandingHeader({ isAuthenticated = false, onLoginClick, onSignupClick }: LandingHeaderProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY > 0;
            setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'Home', to: '/' },
        { label: 'About', to: '/about' },
        { label: 'Contact', to: '/contact' },
    ];

    return (
        <header
            className={cn(
                'sticky top-0 z-50 w-full border-b bg-[#fafbfc] transition-all duration-200',
                isScrolled
                    ? 'border-[#e8ecf1] backdrop-blur-md'
                    : 'border-transparent',
            )}
        >
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link
                    to="/"
                    className="flex items-center gap-2 font-display text-lg font-semibold text-blue-600"
                >
                    <GraduationCap className="size-6 text-blue-600" aria-hidden="true" />
                    <span className="hidden sm:inline">Resnet Academy</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden gap-8 lg:flex">
                    {navLinks.map(({ label, to }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                cn(
                                    'rounded-full px-3 py-2 text-sm font-medium transition-colors hover:bg-blue-50 hover:text-blue-700',
                                    isActive ? 'text-blue-700' : 'text-ink-600',
                                )
                            }
                        >
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Desktop Auth Buttons */}
                <div className="hidden gap-3 lg:flex">
                    {isAuthenticated ? (
                        <Button variant="primary" size="sm" asChild>
                            <Link to="/dashboard">Go to dashboard</Link>
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900 hover:underline"
                                onClick={onLoginClick}
                            >
                                Log in
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={onSignupClick}
                            >
                                Sign up
                            </Button>
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle + Primary Button */}
                <div className="flex items-center gap-2 lg:hidden">
                    {isAuthenticated ? (
                        <Button variant="primary" size="sm" asChild>
                            <Link to="/dashboard">Dashboard</Link>
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={onSignupClick}
                        >
                            Sign up
                        </Button>
                    )}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="rounded-md p-2 text-ink-600 hover:bg-surface-100"
                        aria-label="Toggle menu"
                        aria-expanded={mobileMenuOpen}
                    >
                        {mobileMenuOpen ? (
                            <X className="size-5" />
                        ) : (
                            <Menu className="size-5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="border-t border-[#e8ecf1] bg-white px-4 py-4 sm:px-6 lg:hidden">
                    <nav className="flex flex-col gap-3">
                        {navLinks.map(({ label, to }) => (
                            <NavLink
                                key={to}
                                to={to}
                                onClick={() => setMobileMenuOpen(false)}
                                className={({ isActive }) =>
                                    cn(
                                        'block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-100 hover:text-ink-900',
                                        isActive ? 'text-blue-700' : 'text-ink-600',
                                    )
                                }
                            >
                                {label}
                            </NavLink>
                        ))}
                        {!isAuthenticated && (
                            <div className="border-t border-[#e8ecf1] pt-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                        onLoginClick();
                                        setMobileMenuOpen(false);
                                    }}
                                >
                                    Log in
                                </Button>
                            </div>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}
