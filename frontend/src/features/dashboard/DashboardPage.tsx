import { useAuth } from '@/lib/auth/AuthContext';
import { MyCoursesPage } from '@/features/enrolment/MyCoursesPage';
import { AdminDashboardPage } from '@/features/admin/dashboard/AdminDashboardPage';
import { InstructorDashboardPage } from '@/features/dashboard/InstructorDashboardPage';

/**
 * `/dashboard` is one route shared by every role — the sidebar (AppShell) already scopes
 * navigation per role, this just picks the right landing content.
 */
export function DashboardPage() {
    const { user } = useAuth();

    if (user?.role === 'admin') return <AdminDashboardPage />;
    if (user?.role === 'instructor') return <InstructorDashboardPage />;
    return <MyCoursesPage />;
}
