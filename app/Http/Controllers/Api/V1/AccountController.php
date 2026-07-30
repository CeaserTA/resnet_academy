<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ChangePasswordRequest;
use App\Http\Requests\Api\V1\UpdateAvatarRequest;
use App\Http\Requests\Api\V1\UpdateProfileRequest;
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
use App\Services\Storage\MediaStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Self-service data export and account deactivation, per architecture.md §7's data-protection
 * note (Uganda's Data Protection and Privacy Act) — export/delete-on-request capability the
 * PRD doesn't detail but flags as something that "should exist." Every action here always
 * targets `$request->user()`'s own account, so no Policy is needed.
 */
final class AccountController extends Controller
{
    /**
     * One shared "profiles/instructors/admins" avatar prefix scheme (Cloudflare R2 media
     * storage) covers all three roles off the same `users.avatar_url` column — chosen by the
     * uploader's own role, never by the caller.
     */
    private const AVATAR_PREFIXES = [
        UserRole::Admin->value => 'admins',
        UserRole::Instructor->value => 'instructors',
        UserRole::Student->value => 'profiles',
    ];

    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly MediaStorageService $mediaStorage,
    ) {}

    /**
     * Self-service profile photo upload — works identically for students, instructors, and
     * admins; only the storage prefix differs, picked from the caller's own role.
     */
    public function updateAvatar(UpdateAvatarRequest $request): UserResource
    {
        $user = $request->user();
        $prefix = self::AVATAR_PREFIXES[$user->role->value];

        $this->mediaStorage->delete($user->avatar_url);
        $path = $this->mediaStorage->store($request->file('avatar'), $prefix);

        $user->update(['avatar_url' => $path]);

        return new UserResource($user);
    }

    /**
     * Recomputes `name` from first/last in the same update so every other place that already
     * displays `name` (messages, forum, notifications, the top bar) stays correct with no other
     * changes needed.
     */
    public function updateProfile(UpdateProfileRequest $request): UserResource
    {
        $user = $request->user();
        $data = $request->validated();

        $lastName = $data['last_name'] ?? $user->last_name ?? '';

        $user->update([
            ...$data,
            'name' => trim($data['first_name'].' '.$lastName),
        ]);

        return new UserResource($user);
    }

    /**
     * Self-service password change — verifies the caller actually knows their current password
     * before accepting a new one. `Hash::make()` here matches the same explicit pattern
     * `RegisteredUserController`/`NewPasswordController` already use (the `password_hash`
     * `'hashed'` cast would no-op on an already-hashed value, so this stays consistent either way).
     */
    public function changePassword(ChangePasswordRequest $request): Response
    {
        $user = $request->user();

        if (! Hash::check($request->string('current_password')->toString(), $user->password_hash)) {
            throw ValidationException::withMessages([
                'current_password' => 'That is not your current password.',
            ]);
        }

        $user->update(['password_hash' => Hash::make($request->string('password')->toString())]);

        $this->auditLogger->log(
            action: 'account.password_changed',
            entityType: 'user',
            entityId: $user->id,
            actorId: $user->id,
        );

        return response()->noContent();
    }

    /**
     * Ends every other active session for this account — `SESSION_DRIVER=database` means each
     * one is a real row here, so this is a real sign-out everywhere else, not just a UI gesture.
     * The caller's own current session is deliberately excluded so they stay signed in.
     */
    public function logoutOtherSessions(Request $request): Response
    {
        $user = $request->user();

        DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        $this->auditLogger->log(
            action: 'account.logged_out_other_devices',
            entityType: 'user',
            entityId: $user->id,
            actorId: $user->id,
        );

        return response()->noContent();
    }

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
