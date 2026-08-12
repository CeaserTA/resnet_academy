import { Routes, Route, Navigate, useLocation } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import { LandingPage } from '@/pages/LandingPage';
import { AboutPage } from '@/pages/AboutPage';
import { ContactPage } from '@/pages/ContactPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { VerifyEmailNoticePage } from '@/features/auth/VerifyEmailNoticePage';
import { CourseDetailPage } from '@/features/catalogue/CourseDetailPage';
import { CataloguePage } from '@/features/catalogue/CataloguePage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { CourseListPage } from '@/features/admin/courses/CourseListPage';
import { CourseFormPage } from '@/features/admin/courses/CourseFormPage';
import { ProvisionUserPage } from '@/features/admin/users/ProvisionUserPage';
import { CourseBuilderPage } from '@/features/courseStructure/CourseBuilderPage';
import { CoursePlayerPage } from '@/features/learning/CoursePlayerPage';
import { ResourceViewerPage } from '@/features/learning/ResourceViewerPage';
import { AssignmentSubmitPage } from '@/features/assessment/AssignmentSubmitPage';
import { AssignmentGradingPage } from '@/features/assessment/AssignmentGradingPage';
import { EvaluationTakePage } from '@/features/assessment/EvaluationTakePage';
import { EvaluationGradingPage } from '@/features/assessment/EvaluationGradingPage';
import { GradebookPage } from '@/features/assessment/GradebookPage';
import { AttendanceRosterPage } from '@/features/progress/AttendanceRosterPage';
import { MessagesPage } from '@/features/communication/MessagesPage';
import { TicketsPage } from '@/features/communication/TicketsPage';
import { TicketRedirect } from '@/features/communication/TicketRedirect';
import { ForumPage } from '@/features/communication/ForumPage';
import { ForumModerationPage } from '@/features/communication/ForumModerationPage';
import { ForumsIndexPage } from '@/features/forums/ForumsIndexPage';
import { AuditLogPage } from '@/features/analytics/AuditLogPage';
import { AccountPage } from '@/features/account/AccountPage';
import { ProfileCompletionPage } from '@/features/profile/ProfileCompletionPage';
import { PaymentsPage } from '@/features/admin/payments/PaymentsPage';
import { ApplicationsPage } from '@/features/admin/applications/ApplicationsPage';
import { ReviewsPage } from '@/features/admin/reviews/ReviewsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

function App() {
    const { user, isLoading } = useAuth();
    const location = useLocation();
    // "Browse catalogue" links for signed-in students point at "/#courses" — the landing page is
    // otherwise off-limits once authenticated (redirected to the dashboard), so this hash is the
    // one exception that lets an already-logged-in student still reach the course section there.
    const wantsCourseSection = location.hash === '#courses';

    return (
        <Routes>
            <Route
                index
                element={
                    isLoading ? (
                        <div />
                    ) : user && !wantsCourseSection ? (
                        <Navigate to="/dashboard" replace />
                    ) : (
                        <LandingPage />
                    )
                }
            />
            <Route path="courses" element={<CataloguePage />} />
            <Route path="courses/:id" element={<CourseDetailPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="verify-certificate" element={<VerifyEmailNoticePage />} />

            <Route
                element={
                    <ProtectedRoute>
                        <AppShell />
                    </ProtectedRoute>
                }
            >
                <Route path="verify-email" element={<VerifyEmailNoticePage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="account" element={<AccountPage />} />
                <Route path="profile/complete" element={<ProfileCompletionPage />} />
                <Route path="profile/edit" element={<ProfileCompletionPage />} />

                <Route
                    path="admin/courses"
                    element={
                        <ProtectedRoute roles={['admin', 'instructor']}>
                            <CourseListPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/courses/new"
                    element={
                        <ProtectedRoute roles={['admin']}>
                            <CourseFormPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/courses/:id/edit"
                    element={
                        <ProtectedRoute roles={['admin', 'instructor']}>
                            <CourseFormPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/applications"
                    element={
                        <ProtectedRoute roles={['admin', 'instructor']}>
                            <ApplicationsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/reviews"
                    element={
                        <ProtectedRoute roles={['admin']}>
                            <ReviewsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/payments"
                    element={
                        <ProtectedRoute roles={['admin']}>
                            <PaymentsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/users"
                    element={
                        <ProtectedRoute roles={['admin']}>
                            <ProvisionUserPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/courses/:id/modules"
                    element={
                        <ProtectedRoute roles={['admin', 'instructor']}>
                            <CourseBuilderPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/courses/:id/gradebook"
                    element={
                        <ProtectedRoute roles={['admin', 'instructor']}>
                            <GradebookPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/audit-log"
                    element={
                        <ProtectedRoute roles={['admin']}>
                            <AuditLogPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/assignments/:id"
                    element={
                        <ProtectedRoute roles={['admin', 'instructor']}>
                            <AssignmentGradingPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/evaluations/:id"
                    element={
                        <ProtectedRoute roles={['admin', 'instructor']}>
                            <EvaluationGradingPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/resources/:id/attendance"
                    element={
                        <ProtectedRoute roles={['admin', 'instructor']}>
                            <AttendanceRosterPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="learn/courses/:id"
                    element={
                        <ProtectedRoute roles={['student']}>
                            <CoursePlayerPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="learn/resources/:id"
                    element={
                        <ProtectedRoute roles={['student']}>
                            <ResourceViewerPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="learn/assignments/:id"
                    element={
                        <ProtectedRoute roles={['student']}>
                            <AssignmentSubmitPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="learn/evaluations/:id"
                    element={
                        <ProtectedRoute roles={['student']}>
                            <EvaluationTakePage />
                        </ProtectedRoute>
                    }
                />

                <Route path="messages" element={<MessagesPage />} />
                <Route path="messages/:id" element={<MessagesPage />} />
                <Route path="tickets" element={<TicketsPage />} />
                <Route path="tickets/:id" element={<TicketRedirect />} />
                <Route path="forums" element={<ForumsIndexPage />} />
                <Route path="courses/:id/forum" element={<ForumPage />} />
                <Route
                    path="courses/:id/forum/moderation"
                    element={
                        <ProtectedRoute roles={['admin', 'instructor']}>
                            <ForumModerationPage />
                        </ProtectedRoute>
                    }
                />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}

export default App;
