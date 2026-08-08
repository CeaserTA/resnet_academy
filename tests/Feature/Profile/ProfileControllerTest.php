<?php

declare(strict_types=1);

use App\Models\User;

/**
 * Integration tests for ProfileController endpoints.
 * Tests profile completion status retrieval and profile updates.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 4.5
 */

it('returns profile status with correct structure for authenticated user', function (): void {
    $user = User::factory()->student()->create([
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'phone' => null,
        'country' => 'Uganda',
        'city' => null,
        'highest_qualification' => 'Bachelor\'s Degree',
    ]);

    $response = $this->actingAs($user)->getJson('/api/v1/profile/status');

    $response->assertOk()
        ->assertJsonStructure([
            'percentage',
            'missing',
            'completed',
        ]);

    $data = $response->json();

    // With name, email, country, highest_qualification filled = 4/6 fields = 66.67%
    expect($data['percentage'])->toBe(66.67);
    expect($data['missing'])->toContain('phone', 'city');
    expect($data['completed'])->toContain('name', 'email', 'country', 'highest_qualification');
});

it('returns 401 when unauthenticated user requests profile status', function (): void {
    $this->getJson('/api/v1/profile/status')
        ->assertUnauthorized();
});

it('updates user profile successfully with valid data', function (): void {
    $user = User::factory()->student()->create([
        'first_name' => 'John',
        'last_name' => 'Doe',
        'phone' => null,
        'country' => null,
        'city' => null,
        'highest_qualification' => null,
    ]);

    $response = $this->actingAs($user)->putJson('/api/v1/profile', [
        'first_name' => 'Jane',
        'last_name' => 'Smith',
        'phone' => '+256 700 123456',
        'country' => 'Uganda',
        'city' => 'Kampala',
        'highest_qualification' => 'Master\'s Degree',
        'bio' => 'Software developer passionate about education',
        'occupation' => 'Software Engineer',
        'linkedin_profile' => 'https://linkedin.com/in/janesmith',
        'portfolio_website' => 'https://janesmith.dev',
    ]);

    $response->assertOk();

    $user->refresh();

    expect($user->first_name)->toBe('Jane');
    expect($user->last_name)->toBe('Smith');
    expect($user->name)->toBe('Jane Smith'); // name recomputed
    expect($user->phone)->toBe('+256 700 123456');
    expect($user->country)->toBe('Uganda');
    expect($user->city)->toBe('Kampala');
    expect($user->highest_qualification)->toBe('Master\'s Degree');
    expect($user->bio)->toBe('Software developer passionate about education');
    expect($user->occupation)->toBe('Software Engineer');
    expect($user->linkedin_profile)->toBe('https://linkedin.com/in/janesmith');
    expect($user->portfolio_website)->toBe('https://janesmith.dev');
});

it('returns 422 validation error for invalid phone format', function (): void {
    $user = User::factory()->student()->create();

    // Phone with invalid characters (letters and special chars not allowed)
    $response = $this->actingAs($user)->putJson('/api/v1/profile', [
        'first_name' => 'John',
        'phone' => 'abcd!@#$%',
    ]);

    $response->assertStatus(422)
        ->assertJson([
            'error' => [
                'code' => 'validation_failed',
                'fields' => [
                    'phone' => [
                        'The phone field format is invalid.',
                    ],
                ],
            ],
        ]);
});

it('returns 422 validation error for invalid highest_qualification', function (): void {
    $user = User::factory()->student()->create();

    $response = $this->actingAs($user)->putJson('/api/v1/profile', [
        'first_name' => 'John',
        'highest_qualification' => 'Invalid Degree',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonPath('error.fields.highest_qualification', fn ($errors) => count($errors) > 0);
});

it('returns 422 validation error for invalid URL fields', function (): void {
    $user = User::factory()->student()->create();

    $response = $this->actingAs($user)->putJson('/api/v1/profile', [
        'first_name' => 'John',
        'linkedin_profile' => 'not-a-url',
        'portfolio_website' => 'also-not-a-url',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonPath('error.fields.linkedin_profile', fn ($errors) => count($errors) > 0)
        ->assertJsonPath('error.fields.portfolio_website', fn ($errors) => count($errors) > 0);
});

it('validates phone number length constraints', function (): void {
    $user = User::factory()->student()->create();

    // Too short
    $response = $this->actingAs($user)->putJson('/api/v1/profile', [
        'first_name' => 'John',
        'phone' => '1234567', // 7 chars, minimum is 8
    ]);
    $response->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonPath('error.fields.phone', fn ($errors) => count($errors) > 0);

    // Too long
    $response = $this->actingAs($user)->putJson('/api/v1/profile', [
        'first_name' => 'John',
        'phone' => '123456789012345678901', // 21 chars, maximum is 20
    ]);
    $response->assertStatus(422)
        ->assertJsonPath('error.code', 'validation_failed')
        ->assertJsonPath('error.fields.phone', fn ($errors) => count($errors) > 0);

    // Valid length
    $response = $this->actingAs($user)->putJson('/api/v1/profile', [
        'first_name' => 'John',
        'phone' => '+256700123456', // 13 chars, within range
    ]);
    $response->assertOk();
});

it('updates profile status after profile modification', function (): void {
    $user = User::factory()->student()->create([
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'phone' => null,
        'country' => null,
        'city' => null,
        'highest_qualification' => null,
    ]);

    // Check initial status - only name and email completed (2/6 = 33.33%)
    $statusResponse = $this->actingAs($user)->getJson('/api/v1/profile/status');
    expect($statusResponse->json('percentage'))->toBe(33.33);
    expect($statusResponse->json('missing'))->toHaveCount(4);

    // Update profile to complete all required fields
    $this->actingAs($user)->putJson('/api/v1/profile', [
        'first_name' => 'John',
        'last_name' => 'Doe',
        'phone' => '+256700123456',
        'country' => 'Uganda',
        'city' => 'Kampala',
        'highest_qualification' => 'Bachelor\'s Degree',
    ]);

    // Check updated status - all fields completed (6/6 = 100%)
    $statusResponse = $this->actingAs($user)->getJson('/api/v1/profile/status');
    expect($statusResponse->json('percentage'))->toEqual(100);
    expect($statusResponse->json('missing'))->toBeEmpty();
    expect($statusResponse->json('completed'))->toHaveCount(6);
});

it('returns UserResource format in update response', function (): void {
    $user = User::factory()->student()->create();

    $response = $this->actingAs($user)->putJson('/api/v1/profile', [
        'first_name' => 'John',
        'last_name' => 'Doe',
        'phone' => '+256700123456',
    ]);

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                'id',
                'role',
                'name',
                'first_name',
                'last_name',
                'email',
                'phone',
                'avatar_url',
                'bio',
                'country',
                'city',
                'postal_code',
                'tax_id',
                'status',
                'email_verified_at',
                'last_login_at',
                'created_at',
            ],
        ]);
});

it('allows partial profile updates without requiring all fields', function (): void {
    $user = User::factory()->student()->create([
        'first_name' => 'John',
        'last_name' => 'Doe',
        'phone' => '+256700123456',
        'country' => 'Uganda',
        'city' => 'Kampala',
    ]);

    // Update only phone and city
    $response = $this->actingAs($user)->putJson('/api/v1/profile', [
        'first_name' => 'John', // Required by validation
        'phone' => '+256700999999',
        'city' => 'Entebbe',
    ]);

    $response->assertOk();

    $user->refresh();
    expect($user->phone)->toBe('+256700999999');
    expect($user->city)->toBe('Entebbe');
    expect($user->country)->toBe('Uganda'); // unchanged
});

it('returns 401 when unauthenticated user attempts to update profile', function (): void {
    $this->putJson('/api/v1/profile', [
        'first_name' => 'John',
        'phone' => '+256700123456',
    ])->assertUnauthorized();
});

it('accepts valid highest_qualification enum values', function (): void {
    $user = User::factory()->student()->create();

    $validQualifications = [
        'High School',
        'Diploma',
        'Bachelor\'s Degree',
        'Master\'s Degree',
        'Doctorate',
        'Other',
    ];

    foreach ($validQualifications as $qualification) {
        $response = $this->actingAs($user)->putJson('/api/v1/profile', [
            'first_name' => 'John',
            'highest_qualification' => $qualification,
        ]);

        $response->assertOk();
        expect($user->fresh()->highest_qualification)->toBe($qualification);
    }
});

it('handles null optional fields without errors', function (): void {
    $user = User::factory()->student()->create();

    $response = $this->actingAs($user)->putJson('/api/v1/profile', [
        'first_name' => 'John',
        'last_name' => 'Doe',
        'phone' => '+256700123456',
        'country' => 'Uganda',
        'city' => 'Kampala',
        'highest_qualification' => 'Bachelor\'s Degree',
        // Optional fields omitted
    ]);

    $response->assertOk();

    $user->refresh();
    expect($user->bio)->toBeNull();
    expect($user->occupation)->toBeNull();
    expect($user->linkedin_profile)->toBeNull();
    expect($user->portfolio_website)->toBeNull();
});
