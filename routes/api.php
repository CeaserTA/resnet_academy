<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\AccountController;
use App\Http\Controllers\Api\V1\Admin\AuditLogController;
use App\Http\Controllers\Api\V1\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\V1\Admin\PaymentSubmissionController as AdminPaymentSubmissionController;
use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\AnnouncementController;
use App\Http\Controllers\Api\V1\AssignmentController;
use App\Http\Controllers\Api\V1\AssignmentSubmissionController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CertificateController;
use App\Http\Controllers\Api\V1\ConversationController;
use App\Http\Controllers\Api\V1\CourseApplicationController;
use App\Http\Controllers\Api\V1\CourseController;
use App\Http\Controllers\Api\V1\CourseReviewController;
use App\Http\Controllers\Api\V1\EnrolmentController;
use App\Http\Controllers\Api\V1\EnrolmentImportController;
use App\Http\Controllers\Api\V1\EvaluationAttemptController;
use App\Http\Controllers\Api\V1\EvaluationController;
use App\Http\Controllers\Api\V1\ForumPostController;
use App\Http\Controllers\Api\V1\ForumPostReportController;
use App\Http\Controllers\Api\V1\ForumTagController;
use App\Http\Controllers\Api\V1\ForumThreadController;
use App\Http\Controllers\Api\V1\GradebookController;
use App\Http\Controllers\Api\V1\GroupController;
use App\Http\Controllers\Api\V1\MessageController;
use App\Http\Controllers\Api\V1\ModuleController;
use App\Http\Controllers\Api\V1\ModuleItemController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PaymentSubmissionController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\ProgressController;
use App\Http\Controllers\Api\V1\QuestionBankController;
use App\Http\Controllers\Api\V1\QuestionController;
use App\Http\Controllers\Api\V1\ResourceController;
use App\Http\Controllers\Api\V1\TicketController;
use App\Http\Controllers\Api\V1\TicketMessageController;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::middleware('auth:sanctum')->get('/user', fn (Request $request) => new UserResource($request->user()));

    // Catalogue — public read, admin/instructor-gated writes via policies.
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/courses', [CourseController::class, 'index']);
    Route::get('/courses/{course}', [CourseController::class, 'show']);
    Route::get('/courses/{course}/modules', [ModuleController::class, 'index']);
    Route::get('/resources/{resource}', [ResourceController::class, 'show']);

    // Public reviews (approved only) — landing page testimonials, no auth required.
    Route::get('/reviews', [CourseReviewController::class, 'publicIndex']);

    // Certificate verification (architecture.md §5.4) — public, no auth: anyone holding a
    // printed certificate can confirm it's genuine.
    Route::get('/certificates/verify/{certificateNumber}', [CertificateController::class, 'verify']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::patch('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        Route::post('/courses', [CourseController::class, 'store']);
        Route::patch('/courses/{course}', [CourseController::class, 'update']);
        Route::delete('/courses/{course}', [CourseController::class, 'destroy']);

        Route::get('/me/data-export', [AccountController::class, 'export']);
        Route::post('/me/avatar', [AccountController::class, 'updateAvatar']);
        Route::post('/account/avatar', [AccountController::class, 'updateAvatar']); // Alias for profile completion feature
        Route::patch('/me/profile', [AccountController::class, 'updateProfile']);
        Route::post('/me/change-password', [AccountController::class, 'changePassword']);

        // Profile completion status and update endpoints (Progressive Student Profile Completion)
        Route::get('/profile/status', [ProfileController::class, 'status']);
        Route::put('/profile', [ProfileController::class, 'update']);

        Route::get('/enrolments', [EnrolmentController::class, 'index']);
        Route::post('/enrolments', [EnrolmentController::class, 'store']);
        Route::post('/enrolments/import', [EnrolmentImportController::class, 'store']);
        Route::post('/enrolments/{enrolment}/withdraw', [EnrolmentController::class, 'withdraw']);

        Route::get('/course-applications', [CourseApplicationController::class, 'index']);
        Route::get('/course-applications/me', [CourseApplicationController::class, 'mine']);
        Route::post('/course-applications', [CourseApplicationController::class, 'store'])->middleware('profile.complete');
        Route::post('/course-applications/{application}/approve', [CourseApplicationController::class, 'approve']);
        Route::post('/course-applications/{application}/reject', [CourseApplicationController::class, 'reject']);
        Route::post('/course-applications/{application}/dismiss', [CourseApplicationController::class, 'dismiss']);

        Route::get('/me/reviews', [CourseReviewController::class, 'mine']);
        Route::post('/courses/{course}/reviews', [CourseReviewController::class, 'store']);
        Route::get('/admin/reviews', [CourseReviewController::class, 'index']);
        Route::post('/admin/reviews/{review}/approve', [CourseReviewController::class, 'approve']);
        Route::post('/admin/reviews/{review}/reject', [CourseReviewController::class, 'reject']);
        Route::post('/admin/reviews/{review}/feature', [CourseReviewController::class, 'feature']);

        Route::post('/orders/{order}/payment-submissions', [PaymentSubmissionController::class, 'store']);

        Route::get('/admin/users', [AdminUserController::class, 'index']);
        Route::post('/admin/users', [AdminUserController::class, 'store']);
        Route::patch('/admin/users/{user}', [AdminUserController::class, 'update']);
        Route::get('/admin/audit-logs', [AuditLogController::class, 'index']);
        Route::get('/admin/dashboard-summary', [AdminDashboardController::class, 'summary']);
        Route::get('/admin/orders', [AdminOrderController::class, 'index']);
        Route::patch('/admin/orders/{order}', [AdminOrderController::class, 'update']);
        Route::patch('/admin/payment-submissions/{paymentSubmission}/confirm', [AdminPaymentSubmissionController::class, 'confirm']);
        Route::patch('/admin/payment-submissions/{paymentSubmission}/reject', [AdminPaymentSubmissionController::class, 'reject']);

        // Course structure (FR-6/FR-7/FR-8) — admin/instructor writes via Policies.
        Route::post('/courses/{course}/modules', [ModuleController::class, 'store']);
        Route::patch('/modules/{module}', [ModuleController::class, 'update']);
        Route::delete('/modules/{module}', [ModuleController::class, 'destroy']);
        Route::get('/courses/{course}/modules/trashed', [ModuleController::class, 'trashed']);
        Route::post('/modules/{module}/restore', [ModuleController::class, 'restore'])->withTrashed();

        Route::get('/courses/{course}/groups', [GroupController::class, 'index']);
        Route::post('/courses/{course}/groups', [GroupController::class, 'store']);
        Route::patch('/groups/{group}', [GroupController::class, 'update']);
        Route::delete('/groups/{group}', [GroupController::class, 'destroy']);
        Route::post('/groups/{group}/members', [GroupController::class, 'addMember']);
        Route::delete('/groups/{group}/members/{student}', [GroupController::class, 'removeMember']);

        // Content delivery (FR-10) — one resource endpoint set for all 7 types.
        Route::post('/modules/{module}/resources', [ResourceController::class, 'store']);
        Route::patch('/resources/{resource}', [ResourceController::class, 'update']);
        Route::delete('/resources/{resource}', [ResourceController::class, 'destroy']);

        Route::patch('/module-items/{moduleItem}', [ModuleItemController::class, 'update']);

        // Progress Engine (FR-13/FR-14) — the only place completion/unlock signals are recorded.
        Route::get('/me/progress', [ProgressController::class, 'dashboard']);
        Route::get('/courses/{course}/progress', [ProgressController::class, 'courseProgress']);
        Route::post('/resources/{resource}/progress/watch', [ProgressController::class, 'watchVideo']);
        Route::post('/resources/{resource}/progress/mark-read', [ProgressController::class, 'markRead']);
        Route::post('/resources/{resource}/progress/mark-opened', [ProgressController::class, 'markOpened']);
        Route::post('/resources/{resource}/progress/attendance', [ProgressController::class, 'markAttendance']);
        Route::get('/resources/{resource}/attendance', [ProgressController::class, 'attendanceRoster']);

        // Certificates (architecture.md §5.4) — issued automatically by the Progress Engine.
        Route::get('/certificates', [CertificateController::class, 'index']);
        Route::get('/certificates/{certificate}', [CertificateController::class, 'show']);

        // Assignments (FR-16/FR-17) — CRUD via instructor/admin Policies, submission + grading below.
        Route::post('/modules/{module}/assignments', [AssignmentController::class, 'store']);
        Route::get('/assignments/{assignment}', [AssignmentController::class, 'show']);
        Route::patch('/assignments/{assignment}', [AssignmentController::class, 'update']);
        Route::delete('/assignments/{assignment}', [AssignmentController::class, 'destroy']);

        Route::get('/assignments/{assignment}/submissions', [AssignmentSubmissionController::class, 'index']);
        Route::post('/assignments/{assignment}/submissions', [AssignmentSubmissionController::class, 'store']);
        Route::post('/submissions/{submission}/grade', [AssignmentSubmissionController::class, 'grade']);

        // Question banks + questions (FR-18) — instructor/admin only, never exposed to students directly.
        Route::get('/courses/{course}/question-banks', [QuestionBankController::class, 'index']);
        Route::post('/courses/{course}/question-banks', [QuestionBankController::class, 'store']);
        Route::delete('/question-banks/{bank}', [QuestionBankController::class, 'destroy']);

        Route::post('/question-banks/{bank}/questions', [QuestionController::class, 'store']);
        Route::delete('/questions/{question}', [QuestionController::class, 'destroy']);

        // Evaluations (FR-19/FR-20) — CRUD, then student attempts served in a separate,
        // answer-key-free shape (AttemptQuestionResource) via EvaluationAttemptController.
        Route::post('/modules/{module}/evaluations', [EvaluationController::class, 'store']);
        Route::get('/evaluations/{evaluation}', [EvaluationController::class, 'show']);
        Route::patch('/evaluations/{evaluation}', [EvaluationController::class, 'update']);
        Route::delete('/evaluations/{evaluation}', [EvaluationController::class, 'destroy']);

        Route::get('/evaluations/{evaluation}/attempts', [EvaluationAttemptController::class, 'index']);
        Route::post('/evaluations/{evaluation}/attempts', [EvaluationAttemptController::class, 'start']);
        Route::get('/attempts/{attempt}', [EvaluationAttemptController::class, 'show']);
        Route::post('/attempts/{attempt}/submit', [EvaluationAttemptController::class, 'submit']);
        Route::post('/attempts/{attempt}/grade', [EvaluationAttemptController::class, 'grade']);

        // Gradebook (FR-21) — aggregated assignment + evaluation grades per student per course.
        Route::get('/courses/{course}/gradebook', [GradebookController::class, 'show']);

        // Analytics dashboard (business rule "Analytics dashboard") — completion rates,
        // at-risk flags, engagement metrics, admin/instructor only.
        Route::get('/courses/{course}/analytics', [AnalyticsController::class, 'courseAnalytics']);
        Route::post('/courses/{course}/at-risk-notice', [AnalyticsController::class, 'notifyAtRisk']);

        // Messaging (FR-15/16/17) — one generic conversations/messages system covers
        // Admin<->Instructor, Instructor<->Student, Admin<->Student; read receipts on show().
        Route::get('/conversations', [ConversationController::class, 'index']);
        Route::get('/conversations/contactable', [ConversationController::class, 'contactable']);
        Route::post('/conversations', [ConversationController::class, 'store']);
        Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
        Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store']);

        // Student support tickets — separate from ad-hoc messaging.
        Route::get('/tickets', [TicketController::class, 'index']);
        Route::post('/tickets', [TicketController::class, 'store']);
        Route::get('/tickets/{ticket}', [TicketController::class, 'show']);
        Route::patch('/tickets/{ticket}', [TicketController::class, 'update']);
        Route::post('/tickets/{ticket}/messages', [TicketMessageController::class, 'store']);

        // Course forums (FR-18) — threaded discussions/replies/search/tags, plus moderation
        // (report/pin/lock/solve).
        Route::get('/courses/{course}/forum/threads', [ForumThreadController::class, 'index']);
        Route::post('/courses/{course}/forum/threads', [ForumThreadController::class, 'store']);
        Route::get('/forum-threads/{thread}', [ForumThreadController::class, 'show']);
        Route::patch('/forum-threads/{thread}', [ForumThreadController::class, 'update']);
        Route::get('/forum-threads/{thread}/posts', [ForumPostController::class, 'index']);
        Route::post('/forum-threads/{thread}/posts', [ForumPostController::class, 'store']);
        Route::patch('/forum-posts/{post}', [ForumPostController::class, 'update']);
        Route::delete('/forum-posts/{post}', [ForumPostController::class, 'destroy']);
        Route::post('/forum-posts/{post}/reports', [ForumPostReportController::class, 'store']);
        Route::get('/courses/{course}/forum/reports', [ForumPostReportController::class, 'index']);
        Route::patch('/forum-post-reports/{report}', [ForumPostReportController::class, 'update']);
        Route::get('/forum-tags', [ForumTagController::class, 'index']);

        // Announcements — one-to-many broadcast from Instructor/Admin to enrolled students.
        Route::get('/courses/{course}/announcements', [AnnouncementController::class, 'index']);
        Route::post('/courses/{course}/announcements', [AnnouncementController::class, 'store']);
        Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy']);

        // Notifications — the in-app read/unread inbox; every write goes through
        // NotificationDispatcher, this is read/acknowledge only.
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    });
});
