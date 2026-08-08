<?php

declare(strict_types=1);

use App\Models\User;
use App\Services\Profile\ProfileService;
use Illuminate\Http\Request;
use App\Http\Middleware\EnsureProfileComplete;

/**
 * Property 18: Configuration-Driven Field Management
 * 
 * **Validates: Requirements 15.2, 15.3, 15.4**
 */

beforeEach(function (): void {
    $this->profileService = new ProfileService();
});

describe('ProfileService Configuration-Driven Behavior', function (): void {
    // Feature: progressive-student-profile-completion, Property 18: Configuration-Driven Field Management
    it('demonstrates all behaviors are driven by getRequiredFields configuration', function (): void {
        /**
         * This test validates that completion percentage, missing fields detection,
         * completeness check, and guard enforcement are all driven solely by the
         * getRequiredFields() configuration. When REQUIRED_FIELDS changes, all
         * behaviors automatically update without code changes.
         */
        
        $requiredFields = $this->profileService->getRequiredFields();
        
        // Create user with random completion states (name/email always provided for DB)
        $userData = [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
        ];
        $expectedComplete = ['name', 'email'];
        $expectedMissing = [];
        
        foreach ($requiredFields as $field) {
            if ($field === 'name' || $field === 'email') {
                continue;
            }
            
            if (rand(0, 1)) {
                $userData[$field] = match($field) {
                    'phone' => fake()->phoneNumber(),
                    'country' => fake()->country(),
                    'city' => fake()->city(),
                    'highest_qualification' => 'Diploma',
                    default => fake()->word(),
                };
                $expectedComplete[] = $field;
            } else {
                $userData[$field] = null;
                $expectedMissing[] = $field;
            }
        }
        
        $user = User::factory()->make($userData);
        
        // Calculate expected values
        $expectedPercentage = round((count($expectedComplete) / count($requiredFields)) * 100, 2);
        $expectedIsComplete = (count($expectedMissing) === 0);
        
        // Verify all methods are consistent with configuration
        expect($this->profileService->getCompletionPercentage($user))->toBe($expectedPercentage)
            ->and($this->profileService->getMissingFields($user))->toEqualCanonicalizing($expectedMissing)
            ->and($this->profileService->isProfileComplete($user))->toBe($expectedIsComplete);
        
        // Verify internal consistency
        if ($expectedPercentage === 100.0) {
            expect($this->profileService->isProfileComplete($user))->toBeTrue()
                ->and($this->profileService->getMissingFields($user))->toBeEmpty();
        }
        
        // Verify guard behavior matches ProfileService (when there are incomplete fields)
        if (!$expectedIsComplete) {
            $persistedUser = User::factory()->create($userData);
            $middleware = new EnsureProfileComplete($this->profileService);
            $request = Request::create('/api/v1/courses/123/apply', 'POST');
            $request->setUserResolver(fn() => $persistedUser);
            
            $response = $middleware->handle($request, fn($req) => response()->json(['success' => true]));
            expect($response->getStatusCode())->toBe(403);
            
            $responseData = json_decode($response->getContent(), true);
            expect($responseData['error']['missing_fields'])->toEqualCanonicalizing($expectedMissing);
        }
    })->repeat(100);
});
