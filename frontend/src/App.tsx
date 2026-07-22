import { Routes, Route } from 'react-router';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { VerifyEmailNoticePage } from '@/features/auth/VerifyEmailNoticePage';
import { CataloguePage } from '@/features/catalogue/CataloguePage';
import { CourseDetailPage } from '@/features/catalogue/CourseDetailPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { CourseListPage } from '@/features/admin/courses/CourseListPage';
import { CourseFormPage } from '@/features/admin/courses/CourseFormPage';
import { CategoryListPage } from '@/features/admin/categories/CategoryListPage';
import { BulkImportPage } from '@/features/admin/enrolments/BulkImportPage';
import { ProvisionUserPage } from '@/features/admin/users/ProvisionUserPage';
import { CourseBuilderPage } from '@/features/courseStructure/CourseBuilderPage';
import { CoursePlayerPage } from '@/features/learning/CoursePlayerPage';
import { ResourceViewerPage } from '@/features/learning/ResourceViewerPage';
import { AssignmentSubmitPage } from '@/features/assessment/AssignmentSubmitPage';
import { AssignmentGradingPage } from '@/features/assessment/AssignmentGradingPage';
import { EvaluationTakePage } from '@/features/assessment/EvaluationTakePage';
import { EvaluationGradingPage } from '@/features/assessment/EvaluationGradingPage';
import { GradebookPage } from '@/features/assessment/GradebookPage';
import { CertificateVerifyPage } from '@/features/progress/CertificateVerifyPage';
import { AttendanceRosterPage } from '@/features/progress/AttendanceRosterPage';
import { InboxPage } from '@/features/communication/InboxPage';
import { ConversationPage } from '@/features/communication/ConversationPage';
import { TicketsPage } from '@/features/communication/TicketsPage';
import { TicketDetailPage } from '@/features/communication/TicketDetailPage';
import { ForumPage } from '@/features/communication/ForumPage';
import { ForumModerationPage } from '@/features/communication/ForumModerationPage';
import { AnalyticsDashboardPage } from '@/features/analytics/AnalyticsDashboardPage';
import { AuditLogPage } from '@/features/analytics/AuditLogPage';
import { AccountPage } from '@/features/account/AccountPage';
import { PaymentsPage } from '@/features/admin/payments/PaymentsPage';
import { ApplicationsPage } from '@/features/admin/applications/ApplicationsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

function App() {
    return (
        <Routes>
            <Route element={<PublicLayout />}>
                <Route index element={<CataloguePage />} />
                <Route path="courses" element={<CataloguePage />} />
                <Route path="courses/:id" element={<CourseDetailPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
                <Route path="verify-certificate" element={<CertificateVerifyPage />} />
            </Route>

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
                        <ProtectedRoute roles={['admin']}>
                            <ApplicationsPage />
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
                    path="admin/categories"
                    element={
                        <ProtectedRoute roles={['admin']}>
                            <CategoryListPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/enrolments/import"
                    element={
                        <ProtectedRoute roles={['admin']}>
                            <BulkImportPage />
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
                    path="admin/courses/:id/analytics"
                    element={
                        <ProtectedRoute roles={['admin', 'instructor']}>
                            <AnalyticsDashboardPage />
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

                <Route path="messages" element={<InboxPage />} />
                <Route path="messages/:id" element={<ConversationPage />} />
                <Route path="tickets" element={<TicketsPage />} />
                <Route path="tickets/:id" element={<TicketDetailPage />} />
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
