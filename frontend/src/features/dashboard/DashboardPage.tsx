import { useAuth } from '@/lib/auth/AuthContext';
import { MyCoursesPage } from '@/features/enrolment/MyCoursesPage';
import { CourseListPage } from '@/features/admin/courses/CourseListPage';
import { AdminDashboardPage } from '@/features/admin/dashboard/AdminDashboardPage';

/**
 * `/dashboard` is one route shared by every role — the sidebar (AppShell) already scopes
 * navigation per role, this just picks the right landing content. Admin gets a real summary
 * dashboard; the course list is still one click away via the "Courses" nav item.
 */
export function DashboardPage() {
    const { user } = useAuth();

    if (user?.role === 'admin') {
        return <AdminDashboardPage />;
    }

    if (user?.role === 'instructor') {
        return <CourseListPage />;
    }

    return <MyCoursesPage />;
}
