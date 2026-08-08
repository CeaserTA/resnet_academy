<?php

declare(strict_types=1);

use App\Models\User;
use App\Services\Profile\ProfileService;

beforeEach(function (): void {
    $this->profileService = new ProfileService();
});

describe('ProfileService Missing Fields Property Tests', function (): void {
    // Feature: progressive-student-profile-completion, Property 2: Missing Fields Detection Accuracy
    it('returns exactly those fields that are null or empty for any user object', function (): void {
        $faker = fake();
        $requiredFields = ['name', 'email', 'phone', 'country', 'city', 'highest_qualification'];
        
        // Generate random user with various field states
        $fieldData = [];
        $expectedMissing = [];
        $expectedCompleted = [];
        
        foreach ($requiredFields as $field) {
            $rand = rand(0, 10);
            
            if ($rand <= 3) {
                // 30% chance of null - should be in missing list
                $fieldData[$field] = null;
                $expectedMissing[] = $field;
            } elseif ($rand <= 5) {
                // 20% chance of empty string - should be in missing list
                $fieldData[$field] = '';
                $expectedMissing[] = $field;
            } elseif ($rand <= 6) {
                // 10% chance of whitespace-only - should be in missing list
                $fieldData[$field] = str_repeat(' ', rand(1, 5));
                $expectedMissing[] = $field;
            } else {
                // 40% chance of valid value - should NOT be in missing list
                $fieldData[$field] = match($field) {
                    'name' => $faker->name(),
                    'email' => $faker->email(),
                    'phone' => $faker->phoneNumber(),
                    'country' => $faker->country(),
                    'city' => $faker->city(),
                    'highest_qualification' => $faker->randomElement([
                        'High School',
                        'Diploma',
                        "Bachelor's Degree",
                        "Master's Degree",
                        'Doctorate',
                        'Other'
                    ]),
                };
                $expectedCompleted[] = $field;
            }
        }
        
        $user = User::factory()->make($fieldData);
        
        // Get missing fields from service
        $actualMissing = $this->profileService->getMissingFields($user);
        
        // Verify missing fields list contains exactly those fields that are null or empty
        expect($actualMissing)->toBeArray()
            ->and(count($actualMissing))->toBe(count($expectedMissing))
            ->and($actualMissing)->toEqualCanonicalizing($expectedMissing);
        
        // Verify fields with valid values are NOT included in missing list
        foreach ($expectedCompleted as $completedField) {
            expect($actualMissing)->not->toContain($completedField);
        }
        
        // Verify all missing fields are actually null or empty in the user object
        foreach ($actualMissing as $missingField) {
            $value = $user->{$missingField};
            $isActuallyMissing = $value === null || (is_string($value) && trim($value) === '');
            expect($isActuallyMissing)->toBeTrue();
        }
        
        // Verify all non-missing fields actually have valid values
        foreach ($requiredFields as $field) {
            if (!in_array($field, $actualMissing, true)) {
                $value = $user->{$field};
                $hasValidValue = $value !== null && (!is_string($value) || trim($value) !== '');
                expect($hasValidValue)->toBeTrue();
            }
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 2: Missing Fields Detection Accuracy
    it('excludes completed fields from missing list regardless of field type', function (): void {
        $faker = fake();
        $requiredFields = ['name', 'email', 'phone', 'country', 'city', 'highest_qualification'];
        
        // Generate random user where some fields are definitely completed
        $fieldData = [];
        $guaranteedComplete = [];
        $guaranteedMissing = [];
        
        foreach ($requiredFields as $field) {
            if (rand(0, 1)) {
                // This field will be completed
                $fieldData[$field] = match($field) {
                    'name' => $faker->name(),
                    'email' => $faker->email(),
                    'phone' => '+' . $faker->numerify('############'),
                    'country' => $faker->country(),
                    'city' => $faker->city(),
                    'highest_qualification' => $faker->randomElement([
                        'High School',
                        'Diploma',
                        "Bachelor's Degree",
                        "Master's Degree",
                        'Doctorate',
                        'Other'
                    ]),
                };
                $guaranteedComplete[] = $field;
            } else {
                // This field will be missing (randomly null, empty, or whitespace)
                $missingType = rand(0, 2);
                $fieldData[$field] = match($missingType) {
                    0 => null,
                    1 => '',
                    2 => '   ',
                };
                $guaranteedMissing[] = $field;
            }
        }
        
        $user = User::factory()->make($fieldData);
        $actualMissing = $this->profileService->getMissingFields($user);
        
        // Verify that completed fields are NOT in the missing list
        foreach ($guaranteedComplete as $completedField) {
            expect($actualMissing)->not->toContain($completedField);
        }
        
        // Verify that missing fields ARE in the missing list
        foreach ($guaranteedMissing as $missingField) {
            expect($actualMissing)->toContain($missingField);
        }
        
        // Verify the total count is correct
        expect(count($actualMissing))->toBe(count($guaranteedMissing));
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 2: Missing Fields Detection Accuracy
    it('handles edge cases: all fields complete, all fields missing, single field missing', function (): void {
        $faker = fake();
        $requiredFields = ['name', 'email', 'phone', 'country', 'city', 'highest_qualification'];
        
        // Randomly choose a scenario
        $scenario = rand(0, 2);
        
        if ($scenario === 0) {
            // All fields complete
            $user = User::factory()->make([
                'name' => $faker->name(),
                'email' => $faker->email(),
                'phone' => $faker->phoneNumber(),
                'country' => $faker->country(),
                'city' => $faker->city(),
                'highest_qualification' => $faker->randomElement(['High School', 'Diploma', "Bachelor's Degree"]),
            ]);
            
            $missing = $this->profileService->getMissingFields($user);
            
            expect($missing)->toBeArray()
                ->and($missing)->toBeEmpty();
                
        } elseif ($scenario === 1) {
            // All fields missing
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
                ->and(count($missing))->toBe(count($requiredFields))
                ->and($missing)->toEqualCanonicalizing($requiredFields);
                
        } else {
            // Single random field missing
            $missingFieldIndex = array_rand($requiredFields);
            $missingFieldName = $requiredFields[$missingFieldIndex];
            
            $fieldData = [
                'name' => $faker->name(),
                'email' => $faker->email(),
                'phone' => $faker->phoneNumber(),
                'country' => $faker->country(),
                'city' => $faker->city(),
                'highest_qualification' => $faker->randomElement(['High School', 'Diploma']),
            ];
            
            // Make one field missing (randomly null, empty, or whitespace)
            $fieldData[$missingFieldName] = match(rand(0, 2)) {
                0 => null,
                1 => '',
                2 => '  ',
            };
            
            $user = User::factory()->make($fieldData);
            $missing = $this->profileService->getMissingFields($user);
            
            expect($missing)->toBeArray()
                ->and(count($missing))->toBe(1)
                ->and($missing)->toContain($missingFieldName);
            
            // Verify all other fields are NOT in missing list
            foreach ($requiredFields as $field) {
                if ($field !== $missingFieldName) {
                    expect($missing)->not->toContain($field);
                }
            }
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 2: Missing Fields Detection Accuracy
    it('correctly distinguishes between empty string, whitespace, and valid values', function (): void {
        $faker = fake();
        // Test fields that can safely be empty without factory constraints
        $testableFields = ['phone', 'country', 'city', 'highest_qualification'];
        
        // Pick a random field to test with different value types
        $testField = $testableFields[array_rand($testableFields)];
        
        // Create base data with all fields complete
        $baseData = [
            'name' => $faker->name(),
            'email' => $faker->email(),
            'phone' => $faker->phoneNumber(),
            'country' => $faker->country(),
            'city' => $faker->city(),
            'highest_qualification' => 'Diploma',
        ];
        
        // Test 1: Empty string should be missing
        $testData = $baseData;
        $testData[$testField] = '';
        $user = User::factory()->make($testData);
        $missing = $this->profileService->getMissingFields($user);
        expect($missing)->toContain($testField)
            ->and(count($missing))->toBe(1);
        
        // Test 2: Whitespace-only should be missing
        $testData = $baseData;
        $testData[$testField] = str_repeat(' ', rand(1, 10));
        $user = User::factory()->make($testData);
        $missing = $this->profileService->getMissingFields($user);
        expect($missing)->toContain($testField)
            ->and(count($missing))->toBe(1);
        
        // Test 3: Valid value should NOT be missing
        $testData = $baseData;
        $testData[$testField] = match($testField) {
            'phone' => $faker->phoneNumber(),
            'country' => $faker->country(),
            'city' => $faker->city(),
            'highest_qualification' => $faker->randomElement(['High School', 'Doctorate']),
            default => $faker->word(),
        };
        $user = User::factory()->make($testData);
        $missing = $this->profileService->getMissingFields($user);
        expect($missing)->not->toContain($testField)
            ->and($missing)->toBeEmpty();
        
        // Test 4: Null should be missing
        $testData = $baseData;
        $testData[$testField] = null;
        $user = User::factory()->make($testData);
        $missing = $this->profileService->getMissingFields($user);
        expect($missing)->toContain($testField)
            ->and(count($missing))->toBe(1);
    })->repeat(100);
});
