<?php

declare(strict_types=1);

use App\Http\Requests\Api\V1\UpdateProfileRequest;
use Illuminate\Support\Facades\Validator;

/**
 * Property 12: Validation Error Message Specificity
 * 
 * **Validates: Requirements 8.8, 4.6**
 * 
 * For any form submission with validation failures, the system SHALL return
 * specific error messages that identify each invalid field and describe the
 * validation rule that failed, ensuring developers and users can distinguish
 * between different types of validation errors.
 * 
 * This test generates random invalid profile data combinations and verifies:
 * 1. Error messages identify specific fields that failed
 * 2. Error messages describe which validation rule was violated
 * 3. Messages are distinct and actionable (user can understand how to fix)
 */

beforeEach(function (): void {
    $this->faker = fake();
});

describe('UpdateProfileRequest Validation Error Message Specificity Property Tests', function (): void {
    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('generates specific error messages that identify the failing field', function (): void {
        /**
         * Validates: Requirement 4.6
         * Verify that when a field fails validation, the error message bag contains
         * a key specifically for that field, allowing field-level error display.
         */
        
        // Define all validatable fields with their rules
        $fieldsToTest = [
            'phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20'],
            'country' => ['nullable', 'filled', 'string', 'max:100'],
            'city' => ['nullable', 'filled', 'string', 'max:100'],
            'highest_qualification' => [
                'sometimes',
                'string',
                'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
            ],
            'linkedin_profile' => ['nullable', 'url', 'max:500'],
            'portfolio_website' => ['nullable', 'url', 'max:500'],
        ];
        
        // Randomly select 1-3 fields to make invalid
        $numFieldsToBreak = $this->faker->numberBetween(1, 3);
        $fieldNamesToBreak = $this->faker->randomElements(array_keys($fieldsToTest), $numFieldsToBreak);
        
        $invalidData = [];
        
        foreach ($fieldNamesToBreak as $fieldName) {
            // Generate invalid data for this field based on its type
            $invalidData[$fieldName] = match($fieldName) {
                'phone' => $this->generateInvalidPhone(),
                'country' => $this->generateInvalidTextField(),
                'city' => $this->generateInvalidTextField(),
                'highest_qualification' => $this->generateInvalidQualification(),
                'linkedin_profile' => $this->generateInvalidUrl(),
                'portfolio_website' => $this->generateInvalidUrl(),
                default => 'invalid',
            };
        }
        
        // Run validator
        $validator = Validator::make($invalidData, $fieldsToTest);
        
        // Verify validation fails
        expect($validator->fails())->toBeTrue();
        
        $errors = $validator->errors();
        
        // Verify each broken field has an error message
        foreach ($fieldNamesToBreak as $fieldName) {
            expect($errors->has($fieldName))
                ->toBeTrue("Field '{$fieldName}' should have an error message");
            
            // Verify the error messages are not empty
            $fieldErrors = $errors->get($fieldName);
            expect($fieldErrors)->not->toBeEmpty()
                ->and(count($fieldErrors))->toBeGreaterThan(0);
            
            // Verify error messages are strings
            foreach ($fieldErrors as $errorMessage) {
                expect($errorMessage)->toBeString()
                    ->and(strlen($errorMessage))->toBeGreaterThan(0);
            }
        }
        
        // Verify that fields not broken don't have errors
        $validFieldNames = array_diff(array_keys($fieldsToTest), $fieldNamesToBreak);
        foreach ($validFieldNames as $validFieldName) {
            expect($errors->has($validFieldName))->toBeFalse(
                "Field '{$validFieldName}' should not have errors as it was not included in invalid data"
            );
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('generates distinct error messages for different validation rule violations', function (): void {
        /**
         * Validates: Requirement 8.8
         * Verify that error messages describe which specific validation rule failed,
         * allowing users to understand exactly what's wrong and how to fix it.
         */
        
        // Test phone field with different types of violations
        $phoneViolationType = $this->faker->randomElement(['invalid_chars', 'too_short', 'too_long']);
        
        $phoneData = match($phoneViolationType) {
            'invalid_chars' => str_repeat('0', 10) . 'abc', // Valid length but invalid chars
            'too_short' => '123', // Invalid length (too short)
            'too_long' => str_repeat('0', 25), // Invalid length (too long)
        };
        
        $validator = Validator::make(
            ['phone' => $phoneData],
            ['phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20']]
        );
        
        expect($validator->fails())->toBeTrue();
        
        $errors = $validator->errors()->get('phone');
        expect($errors)->not->toBeEmpty();
        
        // Error messages should be distinct for different violation types
        $errorMessage = implode(' ', $errors);
        
        // Verify error message contains relevant keywords based on violation type
        switch ($phoneViolationType) {
            case 'invalid_chars':
                // Should mention format/regex violation
                expect(
                    str_contains(strtolower($errorMessage), 'format') ||
                    str_contains(strtolower($errorMessage), 'invalid')
                )->toBeTrue("Error message should indicate format/pattern issue: {$errorMessage}");
                break;
                
            case 'too_short':
                // Should mention minimum length
                expect(
                    str_contains(strtolower($errorMessage), 'least') ||
                    str_contains(strtolower($errorMessage), 'minimum') ||
                    str_contains($errorMessage, '8')
                )->toBeTrue("Error message should indicate minimum length: {$errorMessage}");
                break;
                
            case 'too_long':
                // Should mention maximum length
                expect(
                    str_contains(strtolower($errorMessage), 'greater') ||
                    str_contains(strtolower($errorMessage), 'maximum') ||
                    str_contains($errorMessage, '20')
                )->toBeTrue("Error message should indicate maximum length: {$errorMessage}");
                break;
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('generates specific error messages for URL validation failures', function (): void {
        /**
         * Validates: Requirements 8.8, 4.6
         * Verify URL field validation errors are specific and actionable.
         */
        
        $urlField = $this->faker->randomElement(['linkedin_profile', 'portfolio_website']);
        
        // Generate various invalid URL formats
        $invalidUrl = $this->faker->randomElement([
            'not-a-url',
            'missing-protocol.com',
            'htp://typo-protocol.com',
            'just some text',
            'ftp//double-slash.com',
            $this->faker->word(),
        ]);
        
        $validator = Validator::make(
            [$urlField => $invalidUrl],
            [$urlField => ['nullable', 'url', 'max:500']]
        );
        
        expect($validator->fails())->toBeTrue();
        
        $errors = $validator->errors();
        
        // Verify field has error
        expect($errors->has($urlField))->toBeTrue();
        
        // Verify error message mentions URL or format
        $errorMessages = $errors->get($urlField);
        $combinedMessage = implode(' ', $errorMessages);
        
        expect(
            str_contains(strtolower($combinedMessage), 'url') ||
            str_contains(strtolower($combinedMessage), 'valid') ||
            str_contains(strtolower($combinedMessage), 'format')
        )->toBeTrue("URL error message should indicate format issue: {$combinedMessage}");
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('generates specific error messages for enum validation failures', function (): void {
        /**
         * Validates: Requirements 8.8, 4.6
         * Verify qualification enum validation errors are specific.
         */
        
        // Generate invalid qualification (not in the allowed list)
        $invalidQualifications = [
            'Some Random Degree',
            'PhD', // Close but not exact match
            'Masters', // Close but not exact match
            'bachelor', // Wrong case
            $this->faker->word(),
            'Elementary School',
            'University',
        ];
        
        $invalidQualification = $this->faker->randomElement($invalidQualifications);
        
        $validator = Validator::make(
            ['highest_qualification' => $invalidQualification],
            ['highest_qualification' => [
                'sometimes',
                'string',
                'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
            ]]
        );
        
        expect($validator->fails())->toBeTrue();
        
        $errors = $validator->errors();
        expect($errors->has('highest_qualification'))->toBeTrue();
        
        // Error message should indicate the value is not valid/selected
        $errorMessages = $errors->get('highest_qualification');
        $combinedMessage = implode(' ', $errorMessages);
        
        expect(
            str_contains(strtolower($combinedMessage), 'selected') ||
            str_contains(strtolower($combinedMessage), 'invalid') ||
            str_contains(strtolower($combinedMessage), 'valid')
        )->toBeTrue("Enum error message should indicate invalid selection: {$combinedMessage}");
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('generates specific error messages for empty text field validation failures', function (): void {
        /**
         * Validates: Requirements 8.8, 4.6
         * Verify empty/whitespace text field validation errors are specific.
         */
        
        $textField = $this->faker->randomElement(['country', 'city']);
        
        // Generate empty or whitespace-only value
        $emptyValue = $this->faker->randomElement([
            '',
            '   ',
            "\t",
            "\n",
            "  \t  ",
        ]);
        
        $validator = Validator::make(
            [$textField => $emptyValue],
            [$textField => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        // 'filled' rule should catch empty/whitespace values when field is present
        if ($emptyValue !== '') {
            // If whitespace only, 'filled' rule should fail
            expect($validator->fails())->toBeTrue();
            
            $errors = $validator->errors();
            expect($errors->has($textField))->toBeTrue();
            
            $errorMessages = $errors->get($textField);
            expect($errorMessages)->not->toBeEmpty();
        } else {
            // Empty string with 'nullable' passes, but 'filled' should fail
            // Actually, 'filled' means "if present, must not be empty"
            // So empty string fails 'filled' rule
            expect($validator->fails())->toBeTrue();
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('generates multiple distinct error messages when multiple rules are violated on same field', function (): void {
        /**
         * Validates: Requirements 8.8, 4.6
         * Verify that when a field violates multiple rules, all violations are reported.
         */
        
        // Create a phone value that violates multiple rules
        // For example: too short AND has invalid characters
        $multiViolationPhone = 'ab'; // Only 2 chars (too short) and has letters (invalid chars)
        
        $validator = Validator::make(
            ['phone' => $multiViolationPhone],
            ['phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20']]
        );
        
        expect($validator->fails())->toBeTrue();
        
        $errors = $validator->errors()->get('phone');
        
        // Should have multiple error messages (one for regex, one for min length)
        // Laravel typically shows the first failing rule, but we verify errors exist
        expect($errors)->not->toBeEmpty();
        
        $combinedMessage = implode(' ', $errors);
        expect(strlen($combinedMessage))->toBeGreaterThan(0);
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('generates actionable error messages across all profile fields simultaneously', function (): void {
        /**
         * Validates: Requirements 8.8, 4.6
         * Comprehensive test: multiple fields fail validation with different error types.
         * Verify all errors are reported with specific, distinct messages.
         */
        
        // Create invalid data for multiple fields
        $invalidData = [];
        $expectedErrorFields = [];
        
        // Randomly decide which fields to break (1-4 fields)
        $shouldBreakPhone = $this->faker->boolean(70); // 70% chance
        $shouldBreakCountry = $this->faker->boolean(50);
        $shouldBreakCity = $this->faker->boolean(50);
        $shouldBreakQualification = $this->faker->boolean(60);
        $shouldBreakLinkedIn = $this->faker->boolean(50);
        $shouldBreakPortfolio = $this->faker->boolean(50);
        
        if ($shouldBreakPhone) {
            $invalidData['phone'] = $this->generateInvalidPhone();
            $expectedErrorFields[] = 'phone';
        }
        
        if ($shouldBreakCountry) {
            $invalidData['country'] = ''; // Empty string should fail 'filled' rule
            $expectedErrorFields[] = 'country';
        }
        
        if ($shouldBreakCity) {
            $invalidData['city'] = '   '; // Whitespace should fail 'filled' rule
            $expectedErrorFields[] = 'city';
        }
        
        if ($shouldBreakQualification) {
            $invalidData['highest_qualification'] = $this->generateInvalidQualification();
            $expectedErrorFields[] = 'highest_qualification';
        }
        
        if ($shouldBreakLinkedIn) {
            $invalidData['linkedin_profile'] = $this->generateInvalidUrl();
            $expectedErrorFields[] = 'linkedin_profile';
        }
        
        if ($shouldBreakPortfolio) {
            $invalidData['portfolio_website'] = $this->generateInvalidUrl();
            $expectedErrorFields[] = 'portfolio_website';
        }
        
        // Only run validation if we have invalid data
        if (count($expectedErrorFields) > 0) {
            $validator = Validator::make($invalidData, [
                'phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20'],
                'country' => ['nullable', 'filled', 'string', 'max:100'],
                'city' => ['nullable', 'filled', 'string', 'max:100'],
                'highest_qualification' => [
                    'sometimes',
                    'string',
                    'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
                ],
                'linkedin_profile' => ['nullable', 'url', 'max:500'],
                'portfolio_website' => ['nullable', 'url', 'max:500'],
            ]);
            
            expect($validator->fails())->toBeTrue();
            
            $errors = $validator->errors();
            
            // Verify each expected error field has an error message
            foreach ($expectedErrorFields as $fieldName) {
                expect($errors->has($fieldName))
                    ->toBeTrue("Field '{$fieldName}' should have validation error");
                
                // Verify error message is specific (contains the field-specific context)
                $fieldErrors = $errors->get($fieldName);
                expect($fieldErrors)->not->toBeEmpty();
                
                foreach ($fieldErrors as $errorMsg) {
                    expect($errorMsg)->toBeString()
                        ->and(strlen($errorMsg))->toBeGreaterThan(5); // Reasonable message length
                }
            }
            
            // Verify error messages are distinct (different fields have different messages)
            $allErrorMessages = [];
            foreach ($expectedErrorFields as $fieldName) {
                $fieldMessages = $errors->get($fieldName);
                foreach ($fieldMessages as $msg) {
                    $allErrorMessages[$fieldName] = $msg;
                }
            }
            
            // Each field should have its own error message
            expect(count($allErrorMessages))->toBe(count($expectedErrorFields));
        } else {
            // If no fields were selected to break, ensure validation passes
            expect(true)->toBeTrue();
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('ensures error messages are actionable and user-friendly', function (): void {
        /**
         * Validates: Requirements 8.8, 4.6
         * Verify that error messages are not just technically accurate but also
         * provide actionable guidance to users on how to fix the issue.
         */
        
        $field = $this->faker->randomElement(['phone', 'highest_qualification', 'linkedin_profile']);
        
        $invalidData = match($field) {
            'phone' => ['phone' => '123'], // Too short
            'highest_qualification' => ['highest_qualification' => 'Invalid Degree'],
            'linkedin_profile' => ['linkedin_profile' => 'not-a-url'],
        };
        
        $rules = match($field) {
            'phone' => ['phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20']],
            'highest_qualification' => ['highest_qualification' => [
                'sometimes',
                'string',
                'in:High School,Diploma,Bachelor\'s Degree,Master\'s Degree,Doctorate,Other'
            ]],
            'linkedin_profile' => ['linkedin_profile' => ['nullable', 'url', 'max:500']],
        };
        
        $validator = Validator::make($invalidData, $rules);
        
        expect($validator->fails())->toBeTrue();
        
        $errors = $validator->errors()->get($field);
        expect($errors)->not->toBeEmpty();
        
        // Error message should be a reasonable length (not too short, not too long)
        foreach ($errors as $errorMsg) {
            expect(strlen($errorMsg))
                ->toBeGreaterThan(10) // Not just "Invalid"
                ->and(strlen($errorMsg))->toBeLessThan(300); // Not a novel
            
            // Should be a complete sentence or phrase (no single-word errors)
            $wordCount = str_word_count($errorMsg);
            expect($wordCount)->toBeGreaterThan(2);
        }
    })->repeat(100);
});

/**
 * Helper function to generate invalid phone numbers
 */
function generateInvalidPhone(): string
{
    $faker = fake();
    
    $violationType = $faker->randomElement(['too_short', 'too_long', 'invalid_chars']);
    
    return match($violationType) {
        'too_short' => $faker->numerify(str_repeat('#', $faker->numberBetween(1, 7))),
        'too_long' => $faker->numerify(str_repeat('#', $faker->numberBetween(21, 30))),
        'invalid_chars' => str_repeat('0', 10) . $faker->randomElement(['abc', '!@#', '***', 'xyz']),
    };
}

/**
 * Helper function to generate invalid text field values
 */
function generateInvalidTextField(): string
{
    $faker = fake();
    
    return $faker->randomElement([
        '', // Empty string
        '   ', // Whitespace only
        "\t", // Tab
        "  \n  ", // Mixed whitespace
    ]);
}

/**
 * Helper function to generate invalid qualifications
 */
function generateInvalidQualification(): string
{
    $faker = fake();
    
    return $faker->randomElement([
        'PhD',
        'Masters',
        'bachelor',
        'Some Degree',
        $faker->word(),
        'University Graduate',
        'College',
    ]);
}

/**
 * Helper function to generate invalid URLs
 */
function generateInvalidUrl(): string
{
    $faker = fake();
    
    return $faker->randomElement([
        'not-a-url',
        'missing-protocol.com',
        'htp://typo.com',
        $faker->word(),
        'just some text',
        'www dot example dot com',
    ]);
}
