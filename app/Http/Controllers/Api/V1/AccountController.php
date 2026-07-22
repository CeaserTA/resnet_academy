<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\AssignmentSubmission;
use App\Models\Certificate;
use App\Models\EngagementEvent;
use App\Models\Enrolment;
use App\Models\EvaluationAttempt;
use App\Models\ForumPost;
use App\Models\Message;
use App\Models\Notification;
use App\Models\Ticket;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

/**
 * Self-service data export and account deactivation, per architecture.md §7's data-protection
 * note (Uganda's Data Protection and Privacy Act) — export/delete-on-request capability the
 * PRD doesn't detail but flags as something that "should exist." Every action here always
 * targets `$request->user()`'s own account, so no Policy is needed.
 */
final class AccountController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * Returns every row this account owns across the tables it appears in, as one downloadable
     * JSON document. Deliberately an exception to "API responses go through Resources": the
     * entire point of a personal-data export is completeness, and every model queried here is
     * already scoped to `$user->id` ownership (no cross-user data, no password hash — `User`
     * itself still goes through `UserResource`).
     */
    public function export(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = [
            'profile' => new UserResource($user),
            'enrolments' => Enrolment::query()->where('student_id', $user->id)->with('course:id,title')->get(),
            'certificates' => Certificate::query()->where('student_id', $user->id)->get(),
            'assignment_submissions' => AssignmentSubmission::query()->where('student_id', $user->id)->get(),
            'evaluation_attempts' => EvaluationAttempt::query()->where('student_id', $user->id)->get(),
            'messages_sent' => Message::query()->where('sender_id', $user->id)->get(),
            'forum_posts' => ForumPost::query()->where('user_id', $user->id)->get(),
            'tickets' => Ticket::query()->where('student_id', $user->id)->get(),
            'notifications' => Notification::query()->where('user_id', $user->id)->get(),
            'engagement_events' => EngagementEvent::query()->where('student_id', $user->id)->get(),
        ];

        $this->auditLogger->log(
            action: 'account.data_exported',
            entityType: 'user',
            entityId: $user->id,
            actorId: $user->id,
        );

        return response()->json($data)
            ->header('Content-Disposition', 'attachment; filename="resnet-data-export.json"');
    }

    /**
     * A soft, reversible deactivation rather than a hard delete: schema.sql's foreign keys mean
     * a real hard delete would cascade into enrolments, submissions, grades, and audit history
     * that other users (instructors, admins) legitimately still need — a course's gradebook
     * shouldn't lose a row because the student later deleted their account. Reversal is an
     * admin action via the existing `PATCH /admin/users/{user}` role/status editor. A full
     * anonymization/hard-delete pipeline is a deliberate follow-up, not built here.
     */
    public function requestDeactivation(Request $request): Response
    {
        $user = $request->user();

        $user->update(['status' => UserStatus::Deactivated]);

        $this->auditLogger->log(
            action: 'account.deactivation_requested',
            entityType: 'user',
            entityId: $user->id,
            actorId: $user->id,
        );

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
