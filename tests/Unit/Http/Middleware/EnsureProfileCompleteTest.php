<?php

declare(strict_types=1);

use App\Http\Middleware\EnsureProfileComplete;
use App\Models\User;
use App\Services\Profile\ProfileService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

beforeEach(function (): void {
    $this->profileService = app(ProfileService::class);
    $this->middleware = new EnsureProfileComplete($this->profileService);
});

describe('EnsureProfileComplete Middleware', function (): void {
    describe('instantiation and injection', function (): void {
        it('can be instantiated directly with ProfileService', function (): void {
            $service = new ProfileService();
            $middleware = new EnsureProfileComplete($service);

            expect($middleware)->toBeInstanceOf(EnsureProfileComplete::class);
        });

        it('can be resolved from the service container', function (): void {
            $middleware = app(EnsureProfileComplete::class);

            expect($middleware)->toBeInstanceOf(EnsureProfileComplete::class);
        });
    });

    describe('middleware behavior with complete profile', function (): void {
        it('allows request to proceed when profile is 100% complete', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890',
                'country' => 'United States',
                'city' => 'New York',
                'highest_qualification' => "Bachelor's Degree",
            ]);

            $request = Request::create('/api/v1/courses/1/apply', 'POST');
            $request->setUserResolver(fn () => $user);

            $nextCalled = false;
            $next = function ($req) use (&$nextCalled) {
                $nextCalled = true;
                return response()->json(['success' => true], 200);
            };

            $response = $this->middleware->handle($request, $next);

            expect($nextCalled)->toBeTrue()
                ->and($response)->toBeInstanceOf(JsonResponse::class)
                ->and($response->getStatusCode())->toBe(200);
        });

        it('passes request through unchanged when profile is complete', function (): void {
            $user = User::factory()->make([
                'name' => 'Jane Smith',
                'email' => 'jane@example.com',
                'phone' => '+9876543210',
                'country' => 'Canada',
                'city' => 'Toronto',
                'highest_qualification' => "Master's Degree",
            ]);

            $request = Request::create('/api/v1/courses/5/apply', 'POST');
            $request->setUserResolver(fn () => $user);

            $expectedResponse = response()->json(['data' => 'test'], 201);
            $next = fn ($req) => $expectedResponse;

            $actualResponse = $this->middleware->handle($request, $next);

            expect($actualResponse)->toBe($expectedResponse);
        });
    });

    describe('middleware behavior with incomplete profile', function (): void {
        it('returns 403 when profile is incomplete', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => null,
                'country' => null,
                'city' => 'New York',
                'highest_qualification' => null,
            ]);

            $request = Request::create('/api/v1/courses/1/apply', 'POST');
            $request->setUserResolver(fn () => $user);

            $nextCalled = false;
            $next = function ($req) use (&$nextCalled) {
                $nextCalled = true;
                return response()->json(['success' => true], 200);
            };

            $response = $this->middleware->handle($request, $next);

            expect($nextCalled)->toBeFalse()
                ->and($response)->toBeInstanceOf(JsonResponse::class)
                ->and($response->getStatusCode())->toBe(403);
        });

        it('returns correct error structure with code, message, and missing_fields', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => null,
                'country' => '',
                'city' => 'New York',
                'highest_qualification' => null,
            ]);

            $request = Request::create('/api/v1/courses/1/apply', 'POST');
            $request->setUserResolver(fn () => $user);

            $next = fn ($req) => response()->json(['success' => true], 200);

            $response = $this->middleware->handle($request, $next);
            $data = $response->getData(true);

            expect($data)->toHaveKey('error')
                ->and($data['error'])->toHaveKeys(['code', 'message', 'missing_fields'])
                ->and($data['error']['code'])->toBe('profile_incomplete')
                ->and($data['error']['message'])->toBe('Please complete your profile before applying for this course.')
                ->and($data['error']['missing_fields'])->toBeArray();
        });

        it('includes accurate missing_fields array in error response', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890',
                'country' => null,
                'city' => null,
                'highest_qualification' => null,
            ]);

            $request = Request::create('/api/v1/courses/1/apply', 'POST');
            $request->setUserResolver(fn () => $user);

            $next = fn ($req) => response()->json(['success' => true], 200);

            $response = $this->middleware->handle($request, $next);
            $data = $response->getData(true);

            expect($data['error']['missing_fields'])->toHaveCount(3)
                ->and($data['error']['missing_fields'])->toContain('country', 'city', 'highest_qualification')
                ->and($data['error']['missing_fields'])->not()->toContain('name', 'email', 'phone');
        });

        it('blocks request and does not call next closure when profile incomplete', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => null,
                'country' => null,
                'city' => null,
                'highest_qualification' => null,
            ]);

            $request = Request::create('/api/v1/courses/1/apply', 'POST');
            $request->setUserResolver(fn () => $user);

            $nextCalled = false;
            $next = function ($req) use (&$nextCalled) {
                $nextCalled = true;
                throw new \Exception('Next closure should not be called');
            };

            $response = $this->middleware->handle($request, $next);

            expect($nextCalled)->toBeFalse()
                ->and($response->getStatusCode())->toBe(403);
        });

        it('treats empty strings as incomplete fields', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '',
                'country' => '',
                'city' => '',
                'highest_qualification' => '',
            ]);

            $request = Request::create('/api/v1/courses/1/apply', 'POST');
            $request->setUserResolver(fn () => $user);

            $next = fn ($req) => response()->json(['success' => true], 200);

            $response = $this->middleware->handle($request, $next);

            expect($response->getStatusCode())->toBe(403);

            $data = $response->getData(true);
            expect($data['error']['missing_fields'])->toHaveCount(4)
                ->and($data['error']['missing_fields'])->toContain('phone', 'country', 'city', 'highest_qualification');
        });

        it('treats whitespace-only strings as incomplete fields', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '   ',
                'country' => "\t\n",
                'city' => 'New York',
                'highest_qualification' => '  ',
            ]);

            $request = Request::create('/api/v1/courses/1/apply', 'POST');
            $request->setUserResolver(fn () => $user);

            $next = fn ($req) => response()->json(['success' => true], 200);

            $response = $this->middleware->handle($request, $next);

            expect($response->getStatusCode())->toBe(403);

            $data = $response->getData(true);
            expect($data['error']['missing_fields'])->toContain('phone', 'country', 'highest_qualification');
        });
    });

    describe('edge cases', function (): void {
        it('handles user with exactly one missing field', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890',
                'country' => 'United States',
                'city' => 'New York',
                'highest_qualification' => null,
            ]);

            $request = Request::create('/api/v1/courses/1/apply', 'POST');
            $request->setUserResolver(fn () => $user);

            $next = fn ($req) => response()->json(['success' => true], 200);

            $response = $this->middleware->handle($request, $next);

            expect($response->getStatusCode())->toBe(403);

            $data = $response->getData(true);
            expect($data['error']['missing_fields'])->toHaveCount(1)
                ->and($data['error']['missing_fields'])->toContain('highest_qualification');
        });

        it('handles user with all fields missing', function (): void {
            $user = User::factory()->make([
                'name' => null,
                'email' => null,
                'phone' => null,
                'country' => null,
                'city' => null,
                'highest_qualification' => null,
            ]);

            $request = Request::create('/api/v1/courses/1/apply', 'POST');
            $request->setUserResolver(fn () => $user);

            $next = fn ($req) => response()->json(['success' => true], 200);

            $response = $this->middleware->handle($request, $next);

            expect($response->getStatusCode())->toBe(403);

            $data = $response->getData(true);
            expect($data['error']['missing_fields'])->toHaveCount(6)
                ->and($data['error']['missing_fields'])->toContain('name', 'email', 'phone', 'country', 'city', 'highest_qualification');
        });

        it('ignores optional fields when determining profile completeness', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890',
                'country' => 'United States',
                'city' => 'New York',
                'highest_qualification' => "Bachelor's Degree",
                'bio' => null, // Optional field
                'occupation' => null, // Optional field
                'linkedin_profile' => null, // Optional field
            ]);

            $request = Request::create('/api/v1/courses/1/apply', 'POST');
            $request->setUserResolver(fn () => $user);

            $nextCalled = false;
            $next = function ($req) use (&$nextCalled) {
                $nextCalled = true;
                return response()->json(['success' => true], 200);
            };

            $response = $this->middleware->handle($request, $next);

            expect($nextCalled)->toBeTrue()
                ->and($response->getStatusCode())->toBe(200);
        });
    });

    describe('property-based tests', function (): void {
        // Feature: progressive-student-profile-completion, Property 4: Application Guard Enforcement
        it('blocks requests when profile completion is less than 100 and allows when 100', function (): void {
            $faker = fake();
            $requiredFields = ['name', 'email', 'phone', 'country', 'city', 'highest_qualification'];
            
            // Generate random field data
            $fieldData = [];
            
            foreach ($requiredFields as $field) {
                $rand = rand(0, 10);
                if ($rand <= 3) {
                    $fieldData[$field] = null; // 30% null
                } elseif ($rand <= 5) {
                    $fieldData[$field] = ''; // 20% empty
                } elseif ($rand <= 6) {
                    $fieldData[$field] = '   '; // 10% whitespace
                } else {
                    // 40% valid value
                    $fieldData[$field] = match($field) {
                        'name' => $faker->name(),
                        'email' => $faker->email(),
                        'phone' => $faker->phoneNumber(),
                        'country' => $faker->country(),
                        'city' => $faker->city(),
                        'highest_qualification' => $faker->randomElement(['High School', 'Diploma', "Bachelor's Degree", "Master's Degree", 'Doctorate', 'Other']),
                    };
                }
            }
            
            $user = User::factory()->make($fieldData);
            
            // Calculate expected completion percentage
            $completionPercentage = $this->profileService->getCompletionPercentage($user);
            
            $request = Request::create('/api/v1/courses/1/apply', 'POST');
            $request->setUserResolver(fn () => $user);
            
            $nextCalled = false;
            $next = function ($req) use (&$nextCalled) {
                $nextCalled = true;
                return response()->json(['success' => true], 200);
            };
            
            $response = $this->middleware->handle($request, $next);
            
            // Property: Block if < 100, allow if = 100
            if ($completionPercentage < 100) {
                expect($nextCalled)->toBeFalse(
                    "Middleware should block request when completion is {$completionPercentage}%, but it allowed the request"
                );
                expect($response->getStatusCode())->toBe(403);
                
                $data = $response->getData(true);
                expect($data)->toHaveKey('error')
                    ->and($data['error'])->toHaveKey('code')
                    ->and($data['error']['code'])->toBe('profile_incomplete')
                    ->and($data['error'])->toHaveKey('missing_fields')
                    ->and($data['error']['missing_fields'])->toBeArray()
                    ->and($data['error']['missing_fields'])->not()->toBeEmpty();
            } else {
                expect($nextCalled)->toBeTrue(
                    "Middleware should allow request when completion is 100%, but it blocked the request"
                );
                expect($response->getStatusCode())->toBe(200);
            }
        })->repeat(100);

        // Additional property: Verify missing_fields accuracy
        it('ensures missing_fields in error response exactly matches ProfileService result', function (): void {
            $faker = fake();
            $requiredFields = ['name', 'email', 'phone', 'country', 'city', 'highest_qualification'];
            
            // Generate random incomplete profile (ensure at least one field is missing)
            $fieldData = [];
            $ensureIncomplete = rand(0, count($requiredFields) - 1);
            
            foreach ($requiredFields as $index => $field) {
                // Force at least one field to be incomplete
                if ($index === $ensureIncomplete) {
                    $fieldData[$field] = null;
                } else {
                    $rand = rand(0, 10);
                    if ($rand <= 4) {
                        $fieldData[$field] = null; // 40% null
                    } elseif ($rand <= 6) {
                        $fieldData[$field] = ''; // 20% empty
                    } else {
                        // 40% valid value
                        $fieldData[$field] = match($field) {
                            'name' => $faker->name(),
                            'email' => $faker->email(),
                            'phone' => $faker->phoneNumber(),
                            'country' => $faker->country(),
                            'city' => $faker->city(),
                            'highest_qualification' => $faker->randomElement(['High School', 'Diploma', "Bachelor's Degree", "Master's Degree", 'Doctorate', 'Other']),
                        };
                    }
                }
            }
            
            $user = User::factory()->make($fieldData);
            
            // Get expected missing fields from service
            $expectedMissingFields = $this->profileService->getMissingFields($user);
            
            $request = Request::create('/api/v1/courses/1/apply', 'POST');
            $request->setUserResolver(fn () => $user);
            
            $next = fn ($req) => response()->json(['success' => true], 200);
            
            $response = $this->middleware->handle($request, $next);
            
            // Should be 403 since we ensured at least one field is incomplete
            expect($response->getStatusCode())->toBe(403);
            
            $data = $response->getData(true);
            $actualMissingFields = $data['error']['missing_fields'];
            
            // Property: missing_fields must exactly match ProfileService result
            expect($actualMissingFields)->toHaveCount(count($expectedMissingFields))
                ->and(array_diff($actualMissingFields, $expectedMissingFields))->toBeEmpty()
                ->and(array_diff($expectedMissingFields, $actualMissingFields))->toBeEmpty();
        })->repeat(50);
    });

    describe('integration with ProfileService', function (): void {
        it('uses ProfileService isProfileComplete method correctly', function (): void {
            $completeUser = User::factory()->make([
                'name' => 'Complete User',
                'email' => 'complete@example.com',
                'phone' => '+1234567890',
                'country' => 'United States',
                'city' => 'New York',
                'highest_qualification' => "Bachelor's Degree",
            ]);

            $incompleteUser = User::factory()->make([
                'name' => 'Incomplete User',
                'email' => 'incomplete@example.com',
                'phone' => null,
                'country' => null,
                'city' => null,
                'highest_qualification' => null,
            ]);

            // Verify ProfileService agrees with our expectations
            expect($this->profileService->isProfileComplete($completeUser))->toBeTrue()
                ->and($this->profileService->isProfileComplete($incompleteUser))->toBeFalse();

            // Test middleware with complete user
            $request1 = Request::create('/test', 'POST');
            $request1->setUserResolver(fn () => $completeUser);
            $next = fn ($req) => response()->json(['success' => true], 200);
            $response1 = $this->middleware->handle($request1, $next);
            expect($response1->getStatusCode())->toBe(200);

            // Test middleware with incomplete user
            $request2 = Request::create('/test', 'POST');
            $request2->setUserResolver(fn () => $incompleteUser);
            $response2 = $this->middleware->handle($request2, $next);
            expect($response2->getStatusCode())->toBe(403);
        });

        it('uses ProfileService getMissingFields method correctly', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => null,
                'country' => 'United States',
                'city' => null,
                'highest_qualification' => "Bachelor's Degree",
            ]);

            $expectedMissing = $this->profileService->getMissingFields($user);

            $request = Request::create('/test', 'POST');
            $request->setUserResolver(fn () => $user);
            $next = fn ($req) => response()->json(['success' => true], 200);

            $response = $this->middleware->handle($request, $next);
            $data = $response->getData(true);

            expect($data['error']['missing_fields'])->toBe($expectedMissing);
        });
    });
});

