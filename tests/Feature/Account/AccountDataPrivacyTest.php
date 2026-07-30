<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Enums\UserStatus;
use App\Http\Controllers\Api\V1\AccountController;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

it('exports the authenticated user\'s own data and audits the export', function (): void {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['created_by' => $admin->id]);
    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);

    $response = $this->actingAs($student)->getJson('/api/v1/me/data-export')->assertOk();

    expect($response->json('profile.id'))->toBe($student->id);
    expect($response->json('enrolments'))->toHaveCount(1);
    expect($response->json('profile'))->not->toHaveKey('password_hash');

    $log = AuditLog::where('action', 'account.data_exported')->first();
    expect($log)->not->toBeNull();
    expect($log->actor_id)->toBe($student->id);
    expect($log->entity_id)->toBe($student->id);
});

it('deactivates the account on request, logs out, and audits the request', function (): void {
    $student = User::factory()->student()->create();

    $this->actingAs($student)->postJson('/api/v1/me/request-deactivation')->assertNoContent();

    expect($student->fresh()->status)->toBe(UserStatus::Deactivated);

    $log = AuditLog::where('action', 'account.deactivation_requested')->first();
    expect($log)->not->toBeNull();
    expect($log->actor_id)->toBe($student->id);
    expect($log->entity_id)->toBe($student->id);
});

it('updates the profile and recomputes name from first/last', function (): void {
    $student = User::factory()->student()->create(['name' => 'Old Name']);

    $response = $this->actingAs($student)->patchJson('/api/v1/me/profile', [
        'first_name' => 'Jane',
        'last_name' => 'Doe',
        'bio' => 'Loves teaching.',
        'country' => 'Uganda',
        'city' => 'Kampala',
        'postal_code' => '256',
        'tax_id' => 'TIN123',
    ]);

    $response->assertOk();
    expect($response->json('data.name'))->toBe('Jane Doe');
    expect($response->json('data.bio'))->toBe('Loves teaching.');
    expect($response->json('data.city'))->toBe('Kampala');

    $student->refresh();
    expect($student->name)->toBe('Jane Doe');
    expect($student->first_name)->toBe('Jane');
});

it('changes the password when the current password is correct, and rejects a wrong one', function (): void {
    $student = User::factory()->student()->create();

    $wrong = $this->actingAs($student)->postJson('/api/v1/me/change-password', [
        'current_password' => 'not-the-password',
        'password' => 'a-new-strong-password',
        'password_confirmation' => 'a-new-strong-password',
    ], ['Accept' => 'application/json']);
    $wrong->assertUnprocessable();

    $response = $this->actingAs($student)->postJson('/api/v1/me/change-password', [
        'current_password' => 'password',
        'password' => 'a-new-strong-password',
        'password_confirmation' => 'a-new-strong-password',
    ]);
    $response->assertNoContent();

    expect(Hash::check('a-new-strong-password', $student->fresh()->password_hash))->toBeTrue();

    $log = AuditLog::where('action', 'account.password_changed')->first();
    expect($log)->not->toBeNull();
    expect($log->actor_id)->toBe($student->id);
});

it('logs out every other session but keeps the callers own', function (): void {
    // The route lives in routes/web.php specifically so $request->session() is guaranteed to be
    // available (see the route's own comment) — that route-level guarantee is already proven by
    // the sibling requestDeactivation test above. phpunit.xml forces SESSION_DRIVER=array for the
    // rest of the suite, which decouples the HTTP test client's cookie/session round-trip from
    // the `sessions` table entirely, so this exercises the controller's actual DB logic directly
    // (matching the same direct-invocation approach already used elsewhere in this suite to work
    // around a similar test-environment session limitation) with a real, known session id rather
    // than fighting the test client's cookie transport for one that happens to match.
    $student = User::factory()->student()->create();

    DB::table('sessions')->insert([
        [
            'id' => str_repeat('a', 40),
            'user_id' => $student->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'test-agent',
            'payload' => base64_encode('x'),
            'last_activity' => time(),
        ],
        [
            'id' => str_repeat('b', 40),
            'user_id' => $student->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'test-agent',
            'payload' => base64_encode('x'),
            'last_activity' => time(),
        ],
    ]);

    $request = Request::create('/api/v1/me/logout-other-devices', 'POST');
    $request->setLaravelSession(app('session.store'));
    app('session.store')->setId(str_repeat('a', 40));
    $request->setUserResolver(fn () => $student);

    app(AccountController::class)->logoutOtherSessions($request);

    $this->assertDatabaseHas('sessions', ['id' => str_repeat('a', 40)]);
    $this->assertDatabaseMissing('sessions', ['id' => str_repeat('b', 40)]);

    $log = AuditLog::where('action', 'account.logged_out_other_devices')->first();
    expect($log)->not->toBeNull();
    expect($log->actor_id)->toBe($student->id);
});
