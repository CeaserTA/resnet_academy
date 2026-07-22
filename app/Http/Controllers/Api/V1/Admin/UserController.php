<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StorePrivilegedUserRequest;
use App\Http\Requests\Api\V1\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Notifications\UserProvisionedQueued;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * Instructors/admins are invite-provisioned by an admin, not self-registered
 * (architecture.md §4).
 */
final class UserController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * Admin-only directory, e.g. to populate the instructor picker on course assignment.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        $query = User::query()->orderBy('name');

        if ($request->filled('role')) {
            $query->where('role', $request->string('role'));
        }

        return UserResource::collection($query->paginate(50));
    }

    /**
     * No password is set here — the account gets an unusable placeholder hash and the new user
     * is emailed an invite link (`UserProvisionedQueued`) to set their own password before the
     * account can be used at all, reusing the same token broker `NewPasswordController` validates.
     */
    public function store(StorePrivilegedUserRequest $request): JsonResponse
    {
        $user = User::create([
            'role' => $request->validated('role'),
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password_hash' => Hash::make(Str::random(64)),
        ]);
        $user->refresh();

        $token = Password::broker()->createToken($user);
        $user->notify(new UserProvisionedQueued($token));

        $this->auditLogger->log(
            action: 'user.provisioned',
            entityType: 'user',
            entityId: $user->id,
            actorId: $request->user()->id,
            meta: ['role' => $user->role->value],
        );

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    /**
     * Role/status changes (architecture.md §7): a sensitive mutation, always audited, and
     * never self-service — an admin cannot change their own role or status this way, to
     * avoid an accidental lockout with no other admin to reverse it.
     */
    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        abort_if($user->id === $request->user()->id, 422, 'You cannot change your own role or status.');

        $changes = [];

        if ($request->has('role') && $request->validated('role') !== $user->role->value) {
            $changes['user.role_changed'] = ['from' => $user->role->value, 'to' => $request->validated('role')];
        }

        if ($request->has('status') && $request->validated('status') !== $user->status->value) {
            $changes['user.status_changed'] = ['from' => $user->status->value, 'to' => $request->validated('status')];
        }

        $user->update($request->validated());

        foreach ($changes as $action => $meta) {
            $this->auditLogger->log(
                action: $action,
                entityType: 'user',
                entityId: $user->id,
                actorId: $request->user()->id,
                meta: $meta,
            );
        }

        return new UserResource($user->fresh());
    }
}
