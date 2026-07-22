import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/lib/auth/AuthContext';
import { Spinner } from '@/components/ui/Spinner';
import type { UserRole } from '@/lib/api/types';

interface ProtectedRouteProps {
    children: ReactNode;
    roles?: UserRole[];
}

/**
 * The frontend redirect is a UX convenience only — every write the backend actually accepts
 * is re-checked server-side via Policies (code-standards.md §4), so a hidden/missing nav item
 * here is never the real authorization boundary.
 */
export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <Spinner />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}
