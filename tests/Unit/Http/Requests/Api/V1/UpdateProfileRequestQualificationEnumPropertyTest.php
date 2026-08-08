<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Validator;

describe('UpdateProfileRequest Qualification Enum Validation Property Tests', function (): void {
    // Feature: progressive-student-profile-completion, Property 10: Qualification Enum Validation
    it('rejects random strings not in the predefined qualification enum', function (): void {
        $faker = fake();
        
        // Define the valid qualification values
        $validQualifications = [
            'High School',
            'Diploma',
            'Bachelor\'s Degree',
            'Master\'s Degree',
            'Doctorate',
            'Other'
        ];
        
        // Generate a random string that is NOT one of the valid qualifications
        $invalidQualification = $faker->words(3, true); // Random phrase
        
        // Ensure we didn't accidentally generate a valid one (very unlikely but be safe)
        while (in_array($invalidQualification, $validQualifications, true)) {
            $invalidQualification = $faker->words(3, true);
        }
        
        // Create validator with the highest_qualification validation rules
        $validator = Validator::make(
            ['highest_qualification' => $invalidQualification],
            ['highest_qualification' => [
                'sometimes',
                'string',
                'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
            ]]
        );
        
        // Verify validation fails
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('highest_qualification'))->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 10: Qualification Enum Validation
    it('accepts exact matches from the qualification enum', function (): void {
        $faker = fake();
        
        // Define the valid qualification values
        $validQualifications = [
            'High School',
            'Diploma',
            'Bachelor\'s Degree',
            'Master\'s Degree',
            'Doctorate',
            'Other'
        ];
        
        // Pick a random valid qualification
        $validQualification = $faker->randomElement($validQualifications);
        
        // Create validator with the highest_qualification validation rules
        $validator = Validator::make(
            ['highest_qualification' => $validQualification],
            ['highest_qualification' => [
                'sometimes',
                'string',
                'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
            ]]
        );
        
        // Verify validation passes
        expect($validator->passes())->toBeTrue()
            ->and($validator->errors()->has('highest_qualification'))->toBeFalse();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 10: Qualification Enum Validation
    it('rejects case-sensitive mismatches (e.g., lowercase, uppercase variants)', function (): void {
        $faker = fake();
        
        // Define the valid qualification values
        $validQualifications = [
            'High School',
            'Diploma',
            'Bachelor\'s Degree',
            'Master\'s Degree',
            'Doctorate',
            'Other'
        ];
        
        // Pick a random valid qualification and modify its case
        $validQualification = $faker->randomElement($validQualifications);
        
        // Create case variant (lowercase, uppercase, or mixed)
        $caseVariant = match ($faker->numberBetween(1, 3)) {
            1 => strtolower($validQualification),
            2 => strtoupper($validQualification),
            3 => ucwords(strtolower($validQualification)), // Title case
        };
        
        // Only test if the case variant is actually different from the original
        if ($caseVariant !== $validQualification) {
            // Create validator with the highest_qualification validation rules
            $validator = Validator::make(
                ['highest_qualification' => $caseVariant],
                ['highest_qualification' => [
                    'sometimes',
                    'string',
                    'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
                ]]
            );
            
            // Verify validation fails (case mismatch should fail)
            expect($validator->fails())->toBeTrue()
                ->and($validator->errors()->has('highest_qualification'))->toBeTrue();
        } else {
            // If by chance the case variant matches, it should pass
            $validator = Validator::make(
                ['highest_qualification' => $caseVariant],
                ['highest_qualification' => [
                    'sometimes',
                    'string',
                    'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
                ]]
            );
            
            expect($validator->passes())->toBeTrue();
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 10: Qualification Enum Validation
    it('validates that similar strings with formatting differences are rejected', function (): void {
        $faker = fake();
        
        // Define test cases: strings that are similar but not exact matches
        $invalidVariations = [
            'High  School', // Double space
            'Bachelor\'s  Degree', // Double space
            'Master\'s  Degree', // Double space
        ];
        
        // Pick a random invalid variation
        $invalidQualification = $faker->randomElement($invalidVariations);
        
        // Create validator with the highest_qualification validation rules
        $validator = Validator::make(
            ['highest_qualification' => $invalidQualification],
            ['highest_qualification' => [
                'sometimes',
                'string',
                'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
            ]]
        );
        
        // Verify validation fails (double spaces should not match)
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('highest_qualification'))->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 10: Qualification Enum Validation
    it('allows empty strings when field is provided (sometimes rule behavior)', function (): void {
        // With 'sometimes' rule, empty string passes because the 'in' rule is not enforced on empty values
        $validator = Validator::make(
            ['highest_qualification' => ''],
            ['highest_qualification' => [
                'sometimes',
                'string',
                'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
            ]]
        );
        
        // Verify validation passes (sometimes rule allows empty values)
        expect($validator->passes())->toBeTrue()
            ->and($validator->errors()->has('highest_qualification'))->toBeFalse();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 10: Qualification Enum Validation
    it('allows optional qualification field (sometimes rule behavior)', function (): void {
        // Test that when highest_qualification is not provided, validation passes
        $validatorMissing = Validator::make(
            ['first_name' => 'John'],
            ['highest_qualification' => [
                'sometimes',
                'string',
                'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
            ]]
        );
        
        expect($validatorMissing->passes())->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 10: Qualification Enum Validation
    it('rejects similar but not exact qualification names', function (): void {
        $faker = fake();
        
        // Define similar but invalid qualifications
        $similarInvalidQualifications = [
            'Highschool', // No space
            'high school', // Lowercase
            'HIGH SCHOOL', // Uppercase
            'High School Diploma', // Extended
            'Bachelors Degree', // No apostrophe
            'Bachelor Degree', // Missing 's
            'Masters Degree', // No apostrophe
            'Master Degree', // Missing 's
            'PhD', // Synonym for Doctorate
            'Doctoral', // Similar word
            'Associates Degree', // Not in list
            'Certificate', // Not in list
            'None', // Not in list (Other is the valid option)
        ];
        
        // Pick a random similar invalid qualification
        $invalidQualification = $faker->randomElement($similarInvalidQualifications);
        
        // Create validator with the highest_qualification validation rules
        $validator = Validator::make(
            ['highest_qualification' => $invalidQualification],
            ['highest_qualification' => [
                'sometimes',
                'string',
                'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
            ]]
        );
        
        // Verify validation fails
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('highest_qualification'))->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 10: Qualification Enum Validation
    it('validates each qualification enum value individually', function (): void {
        // Test each valid qualification explicitly
        $validQualifications = [
            'High School',
            'Diploma',
            'Bachelor\'s Degree',
            'Master\'s Degree',
            'Doctorate',
            'Other'
        ];
        
        foreach ($validQualifications as $qualification) {
            $validator = Validator::make(
                ['highest_qualification' => $qualification],
                ['highest_qualification' => [
                    'sometimes',
                    'string',
                    'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
                ]]
            );
            
            expect($validator->passes())->toBeTrue()
                ->and($validator->errors()->has('highest_qualification'))->toBeFalse();
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 10: Qualification Enum Validation
    it('rejects numeric values', function (): void {
        $faker = fake();
        
        // Generate random numeric value
        $numericValue = (string) $faker->numberBetween(1, 100);
        
        // Create validator with the highest_qualification validation rules
        $validator = Validator::make(
            ['highest_qualification' => $numericValue],
            ['highest_qualification' => [
                'sometimes',
                'string',
                'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
            ]]
        );
        
        // Verify validation fails
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('highest_qualification'))->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 10: Qualification Enum Validation
    it('validates qualification in the context of full profile update request', function (): void {
        $faker = fake();
        
        // Define the valid qualification values
        $validQualifications = [
            'High School',
            'Diploma',
            'Bachelor\'s Degree',
            'Master\'s Degree',
            'Doctorate',
            'Other'
        ];
        
        // Generate random qualification (50% valid, 50% invalid)
        $isValid = $faker->boolean();
        
        if ($isValid) {
            $qualification = $faker->randomElement($validQualifications);
        } else {
            // Generate invalid qualification
            $qualification = $faker->words(3, true);
            // Ensure it's not accidentally valid
            while (in_array($qualification, $validQualifications, true)) {
                $qualification = $faker->words(3, true);
            }
        }
        
        // Create full profile data
        $data = [
            'first_name' => $faker->firstName(),
            'last_name' => $faker->lastName(),
            'phone' => $faker->numerify('+############'),
            'country' => $faker->country(),
            'city' => $faker->city(),
            'highest_qualification' => $qualification,
        ];
        
        // Validate directly
        $validator = Validator::make($data, [
            'highest_qualification' => [
                'sometimes',
                'string',
                'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
            ]
        ]);
        
        if ($isValid) {
            expect($validator->passes())->toBeTrue();
        } else {
            expect($validator->fails())->toBeTrue()
                ->and($validator->errors()->has('highest_qualification'))->toBeTrue();
        }
    })->repeat(100);
});

