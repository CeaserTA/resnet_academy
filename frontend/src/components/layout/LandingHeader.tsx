import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { GraduationCap, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface LandingHeaderProps {
    onLoginClick: () => void;
    onSignupClick: () => void;
}

export function LandingHeader({ onLoginClick, onSignupClick }: LandingHeaderProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY > 0;
            // Only update state if the value actually changed (prevents excessive re-renders)
            setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'Browse Courses', href: '#courses' },
        { label: 'Features', href: '#features' },
        { label: 'Testimonials', href: '#testimonials' },
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
                    className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900"
                >
                    <GraduationCap className="size-6 text-blue-600" aria-hidden="true" />
                    <span className="hidden sm:inline">Resnet LMS</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden gap-8 lg:flex">
                    {navLinks.map(({ label, href }) => (
                        <a
                            key={href}
                            href={href}
                            className="text-sm font-medium text-ink-600 transition-colors hover:text-ink-900"
                        >
                            {label}
                        </a>
                    ))}
                </nav>

                {/* Desktop Auth Buttons */}
                <div className="hidden gap-3 lg:flex">
                    <Button
                        variant="outline"
                        size="sm"
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
                </div>

                {/* Mobile Menu Toggle + Sign Up Button */}
                <div className="flex items-center gap-2 lg:hidden">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onSignupClick}
                    >
                        Sign up
                    </Button>
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
                        {navLinks.map(({ label, href }) => (
                            <a
                                key={href}
                                href={href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="block rounded-md px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-surface-100 hover:text-ink-900"
                            >
                                {label}
                            </a>
                        ))}
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
                    </nav>
                </div>
            )}
        </header>
    );
}
