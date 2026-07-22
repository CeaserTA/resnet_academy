import { Link, Outlet } from 'react-router';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/Button';

export function PublicLayout() {
    const { user, isLoading } = useAuth();

    return (
        <div className="flex min-h-screen flex-col">
            <header className="border-b border-surface-100 bg-surface-0">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
                    <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold text-blue-600">
                        <GraduationCap className="size-6" aria-hidden="true" />
                        Resnet LMS
                    </Link>

                    <nav className="flex items-center gap-3">
                        <Link to="/courses" className="text-sm font-medium text-ink-600 hover:text-ink-900">
                            Browse courses
                        </Link>

                        {!isLoading && !user && (
                            <>
                                <Link to="/login">
                                    <Button variant="ghost">Log in</Button>
                                </Link>
                                <Link to="/register">
                                    <Button variant="primary">Sign up</Button>
                                </Link>
                            </>
                        )}

                        {!isLoading && user && (
                            <Link to="/dashboard">
                                <Button variant="primary">Go to dashboard</Button>
                            </Link>
                        )}
                    </nav>
                </div>
            </header>

            <main className="flex-1 bg-surface-50">
                <Outlet />
            </main>

            <footer className="border-t border-surface-100 bg-surface-0 px-4 py-4 text-center sm:px-6">
                <Link to="/verify-certificate" className="text-sm text-ink-600 hover:text-blue-600 hover:underline">
                    Verify a certificate
                </Link>
            </footer>
        </div>
    );
}
