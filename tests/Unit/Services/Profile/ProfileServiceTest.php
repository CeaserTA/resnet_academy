<?php

declare(strict_types=1);

use App\Models\User;
use App\Services\Profile\ProfileService;

beforeEach(function (): void {
    $this->profileService = new ProfileService();
});

describe('ProfileService', function (): void {
    describe('instantiation and injection', function (): void {
        it('can be instantiated directly', function (): void {
            $service = new ProfileService();

            expect($service)->toBeInstanceOf(ProfileService::class);
        });

        it('can be resolved from the service container', function (): void {
            $service = app(ProfileService::class);

            expect($service)->toBeInstanceOf(ProfileService::class);
        });

        it('can be injected as a dependency', function (): void {
            // Simulates dependency injection in controllers, middleware, etc.
            $service = app()->make(ProfileService::class);

            expect($service)->toBeInstanceOf(ProfileService::class)
                ->and($service->getRequiredFields())->toBeArray()
                ->and($service->getRequiredFields())->toHaveCount(6);
        });
    });

    describe('getRequiredFields', function (): void {
        it('returns correct list of required fields', function (): void {
            $fields = $this->profileService->getRequiredFields();

            expect($fields)->toBeArray()
                ->and($fields)->toHaveCount(6)
                ->and($fields)->toContain('name', 'email', 'phone', 'country', 'city', 'highest_qualification');
        });
    });

    describe('getCompletionPercentage', function (): void {
        it('returns 100 when all required fields are completed', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890',
                'country' => 'United States',
                'city' => 'New York',
                'highest_qualification' => "Bachelor's Degree",
            ]);

            $percentage = $this->profileService->getCompletionPercentage($user);

            expect($percentage)->toBe(100.0);
        });

        it('returns 0 when all required fields are null', function (): void {
            $user = User::factory()->make([
                'name' => null,
                'email' => null,
                'phone' => null,
                'country' => null,
                'city' => null,
                'highest_qualification' => null,
            ]);

            $percentage = $this->profileService->getCompletionPercentage($user);

            expect($percentage)->toBe(0.0);
        });

        it('returns 50 when half of required fields are completed', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890',
                'country' => null,
                'city' => null,
                'highest_qualification' => null,
            ]);

            $percentage = $this->profileService->getCompletionPercentage($user);

            expect($percentage)->toBe(50.0);
        });

        it('returns correct percentage for partial completion', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => null,
                'country' => 'United States',
                'city' => 'New York',
                'highest_qualification' => null,
            ]);

            $percentage = $this->profileService->getCompletionPercentage($user);

            expect($percentage)->toBe(66.67);
        });

        it('treats empty string as incomplete', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '',
                'country' => '',
                'city' => '',
                'highest_qualification' => '',
            ]);

            $percentage = $this->profileService->getCompletionPercentage($user);

            expect($percentage)->toBe(33.33);
        });

        it('treats whitespace-only string as incomplete', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '   ',
                'country' => '  ',
                'city' => "\t\n",
                'highest_qualification' => ' ',
            ]);

            $percentage = $this->profileService->getCompletionPercentage($user);

            expect($percentage)->toBe(33.33);
        });

        it('does not include optional fields in calculation', function (): void {
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

            $percentage = $this->profileService->getCompletionPercentage($user);

            expect($percentage)->toBe(100.0);
        });
    });

    describe('getMissingFields', function (): void {
        it('returns empty array when all required fields are completed', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890',
                'country' => 'United States',
                'city' => 'New York',
                'highest_qualification' => "Bachelor's Degree",
            ]);

            $missing = $this->profileService->getMissingFields($user);

            expect($missing)->toBeArray()
                ->and($missing)->toBeEmpty();
        });

        it('returns all fields when all are null', function (): void {
            $user = User::factory()->make([
                'name' => null,
                'email' => null,
                'phone' => null,
                'country' => null,
                'city' => null,
                'highest_qualification' => null,
            ]);

            $missing = $this->profileService->getMissingFields($user);

            expect($missing)->toBeArray()
                ->and($missing)->toHaveCount(6)
                ->and($missing)->toContain('name', 'email', 'phone', 'country', 'city', 'highest_qualification');
        });

        it('returns only incomplete fields', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => null,
                'country' => '',
                'city' => 'New York',
                'highest_qualification' => null,
            ]);

            $missing = $this->profileService->getMissingFields($user);

            expect($missing)->toBeArray()
                ->and($missing)->toHaveCount(3)
                ->and($missing)->toContain('phone', 'country', 'highest_qualification')
                ->and($missing)->not()->toContain('name', 'email', 'city');
        });

        it('identifies whitespace-only fields as missing', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '   ',
                'country' => 'United States',
                'city' => 'New York',
                'highest_qualification' => "\t\n",
            ]);

            $missing = $this->profileService->getMissingFields($user);

            expect($missing)->toContain('phone', 'highest_qualification');
        });
    });

    describe('isProfileComplete', function (): void {
        it('returns true when all required fields are completed', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890',
                'country' => 'United States',
                'city' => 'New York',
                'highest_qualification' => "Bachelor's Degree",
            ]);

            $isComplete = $this->profileService->isProfileComplete($user);

            expect($isComplete)->toBeTrue();
        });

        it('returns false when any required field is null', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890',
                'country' => 'United States',
                'city' => 'New York',
                'highest_qualification' => null,
            ]);

            $isComplete = $this->profileService->isProfileComplete($user);

            expect($isComplete)->toBeFalse();
        });

        it('returns false when any required field is empty string', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '',
                'country' => 'United States',
                'city' => 'New York',
                'highest_qualification' => "Bachelor's Degree",
            ]);

            $isComplete = $this->profileService->isProfileComplete($user);

            expect($isComplete)->toBeFalse();
        });

        it('returns false when any required field is whitespace-only', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890',
                'country' => '   ',
                'city' => 'New York',
                'highest_qualification' => "Bachelor's Degree",
            ]);

            $isComplete = $this->profileService->isProfileComplete($user);

            expect($isComplete)->toBeFalse();
        });

        it('returns true regardless of optional fields', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890',
                'country' => 'United States',
                'city' => 'New York',
                'highest_qualification' => "Bachelor's Degree",
                'bio' => null,
                'occupation' => null,
            ]);

            $isComplete = $this->profileService->isProfileComplete($user);

            expect($isComplete)->toBeTrue();
        });
    });

    describe('getProfileStatus', function (): void {
        it('returns correct structure with all fields', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890',
                'country' => 'United States',
                'city' => null,
                'highest_qualification' => null,
            ]);

            $status = $this->profileService->getProfileStatus($user);

            expect($status)->toBeArray()
                ->and($status)->toHaveKeys(['percentage', 'missing', 'completed'])
                ->and($status['percentage'])->toBe(66.67)
                ->and($status['missing'])->toBeArray()
                ->and($status['completed'])->toBeArray();
        });

        it('correctly categorizes completed and missing fields', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890',
                'country' => null,
                'city' => 'New York',
                'highest_qualification' => null,
            ]);

            $status = $this->profileService->getProfileStatus($user);

            expect($status['completed'])->toHaveCount(4)
                ->and($status['completed'])->toContain('name', 'email', 'phone', 'city')
                ->and($status['missing'])->toHaveCount(2)
                ->and($status['missing'])->toContain('country', 'highest_qualification');
        });

        it('returns empty missing array for complete profile', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890',
                'country' => 'United States',
                'city' => 'New York',
                'highest_qualification' => "Bachelor's Degree",
            ]);

            $status = $this->profileService->getProfileStatus($user);

            expect($status['percentage'])->toBe(100.0)
                ->and($status['missing'])->toBeEmpty()
                ->and($status['completed'])->toHaveCount(6);
        });

        it('returns empty completed array for completely empty profile', function (): void {
            $user = User::factory()->make([
                'name' => null,
                'email' => null,
                'phone' => null,
                'country' => null,
                'city' => null,
                'highest_qualification' => null,
            ]);

            $status = $this->profileService->getProfileStatus($user);

            expect($status['percentage'])->toBe(0.0)
                ->and($status['completed'])->toBeEmpty()
                ->and($status['missing'])->toHaveCount(6);
        });
    });

    describe('consistency', function (): void {
        it('ensures isProfileComplete returns true only when percentage is 100', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890',
                'country' => 'United States',
                'city' => 'New York',
                'highest_qualification' => "Bachelor's Degree",
            ]);

            $percentage = $this->profileService->getCompletionPercentage($user);
            $isComplete = $this->profileService->isProfileComplete($user);

            expect($percentage)->toBe(100.0)
                ->and($isComplete)->toBeTrue();
        });

        it('ensures isProfileComplete returns false when percentage is less than 100', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => null,
                'country' => 'United States',
                'city' => 'New York',
                'highest_qualification' => "Bachelor's Degree",
            ]);

            $percentage = $this->profileService->getCompletionPercentage($user);
            $isComplete = $this->profileService->isProfileComplete($user);

            expect($percentage)->toBeLessThan(100.0)
                ->and($isComplete)->toBeFalse();
        });

        it('ensures missing fields count matches percentage calculation', function (): void {
            $user = User::factory()->make([
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => null,
                'country' => null,
                'city' => 'New York',
                'highest_qualification' => null,
            ]);

            $percentage = $this->profileService->getCompletionPercentage($user);
            $missingFields = $this->profileService->getMissingFields($user);
            $status = $this->profileService->getProfileStatus($user);

            $totalFields = 6;
            $completedCount = $totalFields - count($missingFields);
            $expectedPercentage = round(($completedCount / $totalFields) * 100, 2);

            expect($percentage)->toBe($expectedPercentage)
                ->and($status['percentage'])->toBe($percentage)
                ->and($status['missing'])->toBe($missingFields);
        });
    });

    describe('property-based tests', function (): void {
        // Feature: progressive-student-profile-completion, Property 1: Profile Completion Percentage Calculation Accuracy
        it('calculates completion percentage correctly for random field combinations', function (): void {
            $faker = fake();
            $requiredFields = ['name', 'email', 'phone', 'country', 'city', 'highest_qualification'];
            $optionalFields = ['bio', 'occupation', 'linkedin_profile', 'portfolio_website', 'avatar_url'];
            
            // Generate random values for each iteration
            $fieldData = [];
            
            // Randomly set required fields (some complete, some null, some empty)
            foreach ($requiredFields as $field) {
                $rand = rand(0, 10);
                if ($rand <= 3) {
                    $fieldData[$field] = null; // 30% chance of null
                } elseif ($rand <= 5) {
                    $fieldData[$field] = ''; // 20% chance of empty string
                } elseif ($rand <= 6) {
                    $fieldData[$field] = '   '; // 10% chance of whitespace
                } else {
                    // 40% chance of valid value
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
            
            // Randomly set optional fields (should not affect calculation)
            foreach ($optionalFields as $field) {
                $fieldData[$field] = rand(0, 1) ? $faker->sentence() : null;
            }
            
            $user = User::factory()->make($fieldData);
            
            // Calculate expected percentage manually
            $completedCount = 0;
            foreach ($requiredFields as $field) {
                $value = $user->{$field};
                // A field is complete if not null and not empty/whitespace (for strings)
                if ($value !== null && (!is_string($value) || trim($value) !== '')) {
                    $completedCount++;
                }
            }
            
            $expectedPercentage = round(($completedCount / count($requiredFields)) * 100, 2);
            
            // Get actual percentage from service
            $actualPercentage = $this->profileService->getCompletionPercentage($user);
            
            // Verify the calculation is correct
            expect($actualPercentage)->toBe($expectedPercentage);
            
            // Verify optional fields don't affect calculation
            // Calculate what percentage would be if optional fields were considered
            $allFields = array_merge($requiredFields, $optionalFields);
            $totalCompletedIncludingOptional = 0;
            foreach ($allFields as $field) {
                $value = $user->{$field};
                if ($value !== null && (!is_string($value) || trim($value) !== '')) {
                    $totalCompletedIncludingOptional++;
                }
            }
            $percentageIfOptionalIncluded = round(($totalCompletedIncludingOptional / count($allFields)) * 100, 2);
            
            // The actual percentage should NOT equal the percentage if optional fields were included
            // (unless by random chance the optional completion rate matches required completion rate)
            if ($percentageIfOptionalIncluded !== $expectedPercentage) {
                expect($actualPercentage)->not->toBe($percentageIfOptionalIncluded);
            }
            
            // Verify percentage is between 0 and 100
            expect($actualPercentage)->toBeGreaterThanOrEqual(0.0)
                ->and($actualPercentage)->toBeLessThanOrEqual(100.0);
        })->repeat(100);

        // Feature: progressive-student-profile-completion, Property 3: Profile Completeness Boolean Consistency
        it('ensures isProfileComplete returns true iff completion percentage equals 100', function (): void {
            $faker = fake();
            $requiredFields = ['name', 'email', 'phone', 'country', 'city', 'highest_qualification'];
            
            // Generate random values for each iteration
            $fieldData = [];
            
            // Randomly set required fields to create various completion states
            foreach ($requiredFields as $field) {
                $rand = rand(0, 10);
                if ($rand <= 3) {
                    $fieldData[$field] = null; // 30% chance of null
                } elseif ($rand <= 5) {
                    $fieldData[$field] = ''; // 20% chance of empty string
                } elseif ($rand <= 6) {
                    $fieldData[$field] = '   '; // 10% chance of whitespace
                } else {
                    // 40% chance of valid value
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
            
            // Get completion status and percentage
            $completionPercentage = $this->profileService->getCompletionPercentage($user);
            $isComplete = $this->profileService->isProfileComplete($user);
            
            // Property: isProfileComplete() returns true IFF percentage equals 100
            if ($completionPercentage === 100.0) {
                expect($isComplete)->toBeTrue(
                    "isProfileComplete should return true when percentage is 100, but returned false"
                );
            } else {
                expect($isComplete)->toBeFalse(
                    "isProfileComplete should return false when percentage is {$completionPercentage}, but returned true"
                );
            }
            
            // Alternative assertion: verify the logical equivalence
            $expectedComplete = ($completionPercentage === 100.0);
            expect($isComplete)->toBe($expectedComplete);
        })->repeat(100);
    });
});
