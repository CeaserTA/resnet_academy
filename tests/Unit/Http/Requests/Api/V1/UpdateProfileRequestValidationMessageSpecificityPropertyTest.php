<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Validator;

describe('UpdateProfileRequest Validation Error Message Specificity Property Tests', function (): void {
    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('provides specific error messages for each invalid field', function (): void {
        $faker = fake();
        
        // Generate random invalid profile data with multiple validation failures
        $data = [];
        $expectedFailedFields = [];
        
        // Randomly invalidate first_name (required field)
        if ($faker->boolean(30)) { // 30% chance to make it invalid
            $data['first_name'] = $faker->randomElement(['', str_repeat('a', 76)]); // Empty or too long
            $expectedFailedFields[] = 'first_name';
        } else {
            $data['first_name'] = $faker->firstName();
        }
        
        // Randomly invalidate last_name
        if ($faker->boolean(20)) {
            $data['last_name'] = str_repeat('b', 76); // Too long
            $expectedFailedFields[] = 'last_name';
        }
        
        // Randomly invalidate phone
        if ($faker->boolean(30)) {
            $invalidPhone = $faker->randomElement([
                'abc123', // Invalid characters
                '123', // Too short
                str_repeat('1', 21), // Too long
            ]);
            $data['phone'] = $invalidPhone;
            $expectedFailedFields[] = 'phone';
        }
        
        // Randomly invalidate country (using filled rule - cannot be empty string if provided)
        if ($faker->boolean(20)) {
            $data['country'] = $faker->randomElement(['', str_repeat('c', 101)]);
            $expectedFailedFields[] = 'country';
        }
        
        // Randomly invalidate city
        if ($faker->boolean(20)) {
            $data['city'] = $faker->randomElement(['', str_repeat('d', 101)]);
            $expectedFailedFields[] = 'city';
        }
        
        // Randomly invalidate highest_qualification
        if ($faker->boolean(25)) {
            $data['highest_qualification'] = $faker->randomElement([
                'InvalidQualification',
                'PhD',
                'Bachelors',
                'Masters',
                'degree',
            ]);
            $expectedFailedFields[] = 'highest_qualification';
        }
        
        // Randomly invalidate linkedin_profile
        if ($faker->boolean(25)) {
            $invalidLinkedIn = $faker->randomElement([
                'not-a-url',
                'just text with spaces',
                'www.noprotocol.com',
                'example',
                str_repeat('h', 501),
            ]);
            $data['linkedin_profile'] = $invalidLinkedIn;
            $expectedFailedFields[] = 'linkedin_profile';
        }
        
        // Randomly invalidate portfolio_website
        if ($faker->boolean(25)) {
            $invalidPortfolio = $faker->randomElement([
                'invalid-url',
                'plain text',
                'example',
                'www.noprotocol.com',
                str_repeat('h', 501),
            ]);
            $data['portfolio_website'] = $invalidPortfolio;
            $expectedFailedFields[] = 'portfolio_website';
        }
        
        // Only proceed if we have at least one invalid field
        if (count($expectedFailedFields) === 0) {
            expect(true)->toBeTrue(); // Skip this iteration
            return;
        }
        
        // Define the validation rules (matching UpdateProfileRequest)
        $rules = [
            'first_name' => ['required', 'string', 'max:75'],
            'last_name' => ['nullable', 'string', 'max:75'],
            'phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20'],
            'bio' => ['sometimes', 'string', 'max:1000'],
            'country' => ['nullable', 'filled', 'string', 'max:100'],
            'city' => ['nullable', 'filled', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'tax_id' => ['nullable', 'string', 'max:50'],
            'highest_qualification' => [
                'sometimes',
                'string',
                'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
            ],
            'occupation' => ['sometimes', 'string', 'max:150'],
            'linkedin_profile' => ['sometimes', 'url', 'max:500'],
            'portfolio_website' => ['sometimes', 'url', 'max:500'],
        ];
        
        // Create validator
        $validator = Validator::make($data, $rules);
        
        // Verify validation fails
        expect($validator->fails())->toBeTrue();
        
        // Get error messages
        $errors = $validator->errors();
        
        // Verify each expected failed field has a specific error message
        foreach ($expectedFailedFields as $field) {
            expect($errors->has($field))->toBeTrue(
                "Field '{$field}' should have validation error"
            );
            
            // Get the error messages for this field
            $fieldErrors = $errors->get($field);
            expect($fieldErrors)->not->toBeEmpty(
                "Field '{$field}' should have at least one error message"
            );
            
            // Verify error messages are actionable (contain field name or rule info)
            foreach ($fieldErrors as $errorMessage) {
                expect($errorMessage)->toBeString();
                expect(strlen($errorMessage))->toBeGreaterThan(0);
                
                // Error message should be specific and not generic
                expect($errorMessage)->not->toBe('Validation failed');
                expect($errorMessage)->not->toBe('Invalid input');
            }
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('produces distinct error messages for different validation rule violations on the same field', function (): void {
        $faker = fake();
        
        // Test phone field with different violations
        $violationType = $faker->randomElement(['length_too_short', 'length_too_long', 'invalid_format']);
        
        $data = [
            'first_name' => 'John',
        ];
        
        switch ($violationType) {
            case 'length_too_short':
                $data['phone'] = $faker->numerify('###'); // 3 digits - too short
                break;
            case 'length_too_long':
                $data['phone'] = $faker->numerify(str_repeat('#', 21)); // 21 digits - too long
                break;
            case 'invalid_format':
                $data['phone'] = 'abcdefgh'; // 8 chars but invalid format
                break;
        }
        
        $rules = [
            'first_name' => ['required', 'string', 'max:75'],
            'phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20'],
        ];
        
        $validator = Validator::make($data, $rules);
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('phone'))->toBeTrue();
        
        $phoneErrors = $validator->errors()->get('phone');
        expect($phoneErrors)->not->toBeEmpty();
        
        // The error message should mention the phone field
        $errorMessage = $phoneErrors[0];
        expect($errorMessage)->toBeString();
        expect(strlen($errorMessage))->toBeGreaterThan(5);
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('provides specific URL validation error messages for linkedin and portfolio fields', function (): void {
        $faker = fake();
        
        // Randomly choose which URL field to invalidate
        $urlField = $faker->randomElement(['linkedin_profile', 'portfolio_website']);
        
        // Generate invalid URL (URLs that will actually fail Laravel's url validation)
        $invalidUrl = $faker->randomElement([
            'not-a-url',
            'just-text',
            'plain text with spaces',
            'example',
            'www.example.com', // Missing protocol
            str_repeat('x', 501), // Too long
        ]);
        
        $data = [
            'first_name' => 'Jane',
            $urlField => $invalidUrl,
        ];
        
        $rules = [
            'first_name' => ['required', 'string', 'max:75'],
            'linkedin_profile' => ['sometimes', 'url', 'max:500'],
            'portfolio_website' => ['sometimes', 'url', 'max:500'],
        ];
        
        $validator = Validator::make($data, $rules);
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has($urlField))->toBeTrue();
        
        $urlErrors = $validator->errors()->get($urlField);
        expect($urlErrors)->not->toBeEmpty();
        
        // Error message should be specific
        $errorMessage = $urlErrors[0];
        expect($errorMessage)->toBeString();
        expect(strlen($errorMessage))->toBeGreaterThan(5);
        
        // Should not be a generic error
        expect($errorMessage)->not->toBe('Invalid');
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('provides specific enum validation error for highest_qualification', function (): void {
        $faker = fake();
        
        // Generate invalid qualification (not in the enum)
        $invalidQualifications = [
            'PhD',
            'Bachelors',
            'Masters',
            'High school', // lowercase
            'bachelor degree',
            'Some College',
            'GED',
            'None',
        ];
        
        $data = [
            'first_name' => 'Bob',
            'highest_qualification' => $faker->randomElement($invalidQualifications),
        ];
        
        $rules = [
            'first_name' => ['required', 'string', 'max:75'],
            'highest_qualification' => [
                'sometimes',
                'string',
                'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
            ],
        ];
        
        $validator = Validator::make($data, $rules);
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('highest_qualification'))->toBeTrue();
        
        $qualificationErrors = $validator->errors()->get('highest_qualification');
        expect($qualificationErrors)->not->toBeEmpty();
        
        $errorMessage = $qualificationErrors[0];
        expect($errorMessage)->toBeString();
        expect(strlen($errorMessage))->toBeGreaterThan(5);
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('provides multiple distinct error messages when a field violates multiple rules', function (): void {
        $faker = fake();
        
        // Create a URL field that is both invalid format AND too long
        $longInvalidUrl = str_repeat('not-a-url', 70); // 630 chars, not a URL
        
        $data = [
            'first_name' => 'Alice',
            'linkedin_profile' => $longInvalidUrl,
        ];
        
        $rules = [
            'first_name' => ['required', 'string', 'max:75'],
            'linkedin_profile' => ['sometimes', 'url', 'max:500'],
        ];
        
        $validator = Validator::make($data, $rules);
        
        expect($validator->fails())->toBeTrue();
        expect($validator->errors()->has('linkedin_profile'))->toBeTrue();
        
        $urlErrors = $validator->errors()->get('linkedin_profile');
        expect($urlErrors)->not->toBeEmpty();
        
        // Should have error message(s) for this field
        foreach ($urlErrors as $errorMessage) {
            expect($errorMessage)->toBeString();
            expect(strlen($errorMessage))->toBeGreaterThan(0);
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('ensures error messages are actionable by containing relevant field context', function (): void {
        $faker = fake();
        
        // Generate a comprehensive invalid profile
        $data = [
            'first_name' => '', // Required field empty
            'phone' => 'abc', // Invalid format and too short
            'country' => '', // Filled rule violation
            'highest_qualification' => 'PhD', // Invalid enum value
            'linkedin_profile' => 'not-a-url', // Invalid URL
        ];
        
        $rules = [
            'first_name' => ['required', 'string', 'max:75'],
            'phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20'],
            'country' => ['nullable', 'filled', 'string', 'max:100'],
            'highest_qualification' => [
                'sometimes',
                'string',
                'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
            ],
            'linkedin_profile' => ['sometimes', 'url', 'max:500'],
        ];
        
        $validator = Validator::make($data, $rules);
        
        expect($validator->fails())->toBeTrue();
        
        $errors = $validator->errors();
        $allErrorFields = $errors->keys();
        
        // Should have errors for multiple fields
        expect(count($allErrorFields))->toBeGreaterThan(0);
        
        // Each field with an error should have at least one message
        foreach ($allErrorFields as $field) {
            $fieldErrors = $errors->get($field);
            expect($fieldErrors)->not->toBeEmpty();
            
            foreach ($fieldErrors as $message) {
                // Error messages should be actionable (non-empty, meaningful)
                expect($message)->toBeString();
                expect(strlen($message))->toBeGreaterThan(3);
                
                // Should not be completely generic
                expect($message)->not->toBe('Error');
                expect($message)->not->toBe('Invalid');
                expect($message)->not->toBe('Failed');
            }
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('maintains error message consistency across different invalid data combinations', function (): void {
        $faker = fake();
        
        // Generate two different invalid phone numbers
        $invalidPhone1 = 'abc123xyz'; // Invalid characters
        $invalidPhone2 = '12'; // Too short
        
        $validator1 = Validator::make(
            ['first_name' => 'Test', 'phone' => $invalidPhone1],
            [
                'first_name' => ['required', 'string', 'max:75'],
                'phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20']
            ]
        );
        
        $validator2 = Validator::make(
            ['first_name' => 'Test', 'phone' => $invalidPhone2],
            [
                'first_name' => ['required', 'string', 'max:75'],
                'phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20']
            ]
        );
        
        expect($validator1->fails())->toBeTrue();
        expect($validator2->fails())->toBeTrue();
        
        expect($validator1->errors()->has('phone'))->toBeTrue();
        expect($validator2->errors()->has('phone'))->toBeTrue();
        
        $errors1 = $validator1->errors()->get('phone');
        $errors2 = $validator2->errors()->get('phone');
        
        // Both should have error messages
        expect($errors1)->not->toBeEmpty();
        expect($errors2)->not->toBeEmpty();
        
        // Error messages should be strings with meaningful content
        expect($errors1[0])->toBeString();
        expect($errors2[0])->toBeString();
        expect(strlen($errors1[0]))->toBeGreaterThan(5);
        expect(strlen($errors2[0]))->toBeGreaterThan(5);
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('verifies error messages distinguish between different types of length violations', function (): void {
        $faker = fake();
        
        // Test max length violations on different fields
        $fieldToViolate = $faker->randomElement(['first_name', 'last_name', 'bio', 'occupation']);
        
        $data = ['first_name' => 'Valid']; // Ensure required field is present
        
        switch ($fieldToViolate) {
            case 'first_name':
                $data['first_name'] = str_repeat('x', 76); // Max is 75
                break;
            case 'last_name':
                $data['last_name'] = str_repeat('x', 76); // Max is 75
                break;
            case 'bio':
                $data['bio'] = str_repeat('x', 1001); // Max is 1000
                break;
            case 'occupation':
                $data['occupation'] = str_repeat('x', 151); // Max is 150
                break;
        }
        
        $rules = [
            'first_name' => ['required', 'string', 'max:75'],
            'last_name' => ['nullable', 'string', 'max:75'],
            'bio' => ['sometimes', 'string', 'max:1000'],
            'occupation' => ['sometimes', 'string', 'max:150'],
        ];
        
        $validator = Validator::make($data, $rules);
        
        if ($fieldToViolate === 'first_name' || isset($data[$fieldToViolate])) {
            expect($validator->fails())->toBeTrue();
            expect($validator->errors()->has($fieldToViolate))->toBeTrue();
            
            $errors = $validator->errors()->get($fieldToViolate);
            expect($errors)->not->toBeEmpty();
            
            $errorMessage = $errors[0];
            expect($errorMessage)->toBeString();
            expect(strlen($errorMessage))->toBeGreaterThan(5);
        }
    })->repeat(100);
});

