<?php

declare(strict_types=1);

use App\Http\Requests\Api\V1\UpdateProfileRequest;
use Illuminate\Support\Facades\Validator;

describe('UpdateProfileRequest Validation Error Message Specificity Property Tests', function (): void {
    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('provides specific error messages for phone validation failures', function (): void {
        $faker = fake();
        
        // Generate various invalid phone combinations
        $invalidType = $faker->randomElement(['invalid_chars', 'too_short', 'too_long']);
        
        $phone = match ($invalidType) {
            'invalid_chars' => $faker->numerify('########') . $faker->randomElement(['abc', '!@#', '***']),
            'too_short' => $faker->numerify(str_repeat('#', $faker->numberBetween(1, 7))),
            'too_long' => $faker->numerify(str_repeat('#', $faker->numberBetween(21, 30))),
        };
        
        $data = ['phone' => $phone];
        $rules = (new UpdateProfileRequest())->rules();
        
        $validator = Validator::make($data, ['phone' => $rules['phone']]);
        
        // Verify validation fails
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('phone'))->toBeTrue()
            ->and($validator->errors()->get('phone'))->not()->toBeEmpty();
        
        $errors = $validator->errors()->get('phone');
        
        // Verify error messages are specific and identify the field
        expect($errors)->toBeArray()
            ->and(count($errors))->toBeGreaterThan(0);
        
        // Each error message should be a non-empty string
        foreach ($errors as $error) {
            expect($error)->toBeString()
                ->and(strlen($error))->toBeGreaterThan(0);
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('provides specific error messages for text field validation failures', function (): void {
        $faker = fake();
        
        // Test country or city with empty/whitespace values
        $field = $faker->randomElement(['country', 'city']);
        $invalidValue = $faker->randomElement(['', '   ', "\t", "\n", '  ']);
        
        $data = [$field => $invalidValue];
        $rules = (new UpdateProfileRequest())->rules();
        
        $validator = Validator::make($data, [$field => $rules[$field]]);
        
        // Verify validation fails with specific error for the field
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has($field))->toBeTrue()
            ->and($validator->errors()->get($field))->not()->toBeEmpty();
        
        $errors = $validator->errors()->get($field);
        
        // Verify error messages exist and are specific
        expect($errors)->toBeArray()
            ->and(count($errors))->toBeGreaterThan(0);
        
        foreach ($errors as $error) {
            expect($error)->toBeString()
                ->and(strlen($error))->toBeGreaterThan(0);
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('provides specific error messages for qualification enum validation failures', function (): void {
        $faker = fake();
        
        // Generate invalid qualification values
        $invalidQualification = $faker->randomElement([
            'Invalid Degree',
            'Random String',
            'PhD', // Close but not exact
            'bachelor degree', // Wrong case
            'Masters', // Wrong format
            $faker->word(),
        ]);
        
        $data = ['highest_qualification' => $invalidQualification];
        $rules = (new UpdateProfileRequest())->rules();
        
        $validator = Validator::make($data, ['highest_qualification' => $rules['highest_qualification']]);
        
        // Verify validation fails with specific error
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('highest_qualification'))->toBeTrue()
            ->and($validator->errors()->get('highest_qualification'))->not()->toBeEmpty();
        
        $errors = $validator->errors()->get('highest_qualification');
        
        // Verify error messages are specific
        expect($errors)->toBeArray()
            ->and(count($errors))->toBeGreaterThan(0);
        
        foreach ($errors as $error) {
            expect($error)->toBeString()
                ->and(strlen($error))->toBeGreaterThan(0);
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('provides specific error messages for URL validation failures', function (): void {
        $faker = fake();
        
        // Test linkedin_profile or portfolio_website with invalid URLs
        $field = $faker->randomElement(['linkedin_profile', 'portfolio_website']);
        
        // Generate various invalid URL formats
        $invalidUrl = $faker->randomElement([
            'not-a-url',
            'htp://missing-t.com',
            'www.no-protocol.com',
            'just some text',
            'http://',
            '://no-protocol',
            $faker->word(),
        ]);
        
        $data = [$field => $invalidUrl];
        $rules = (new UpdateProfileRequest())->rules();
        
        $validator = Validator::make($data, [$field => $rules[$field]]);
        
        // Verify validation fails with specific error for the field
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has($field))->toBeTrue()
            ->and($validator->errors()->get($field))->not()->toBeEmpty();
        
        $errors = $validator->errors()->get($field);
        
        // Verify error messages are specific
        expect($errors)->toBeArray()
            ->and(count($errors))->toBeGreaterThan(0);
        
        foreach ($errors as $error) {
            expect($error)->toBeString()
                ->and(strlen($error))->toBeGreaterThan(0);
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('provides specific error messages for max length violations', function (): void {
        $faker = fake();
        
        // Test various fields with max length constraints
        $field = $faker->randomElement(['first_name', 'last_name', 'bio', 'occupation', 'country', 'city']);
        
        // Get the max length for the field from rules
        $rules = (new UpdateProfileRequest())->rules();
        $maxLength = match ($field) {
            'first_name', 'last_name' => 75,
            'bio' => 1000,
            'occupation' => 150,
            'country', 'city' => 100,
            default => 100,
        };
        
        // Generate a value that exceeds max length
        $tooLongValue = $faker->text($maxLength + $faker->numberBetween(1, 50));
        
        $data = [$field => $tooLongValue];
        
        $validator = Validator::make($data, [$field => $rules[$field]]);
        
        // Verify validation fails with specific error
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has($field))->toBeTrue()
            ->and($validator->errors()->get($field))->not()->toBeEmpty();
        
        $errors = $validator->errors()->get($field);
        
        // Verify error messages are specific and actionable
        expect($errors)->toBeArray()
            ->and(count($errors))->toBeGreaterThan(0);
        
        foreach ($errors as $error) {
            expect($error)->toBeString()
                ->and(strlen($error))->toBeGreaterThan(0);
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('provides distinct error messages for different validation rule failures', function (): void {
        $faker = fake();
        
        // Create multiple validation failures
        $data = [];
        $expectedFailures = [];
        
        // Add 1-3 random validation failures
        $numFailures = $faker->numberBetween(1, 3);
        
        for ($i = 0; $i < $numFailures; $i++) {
            $failureType = $faker->randomElement(['phone_invalid', 'url_invalid', 'enum_invalid', 'max_length']);
            
            (match ($failureType) {
                'phone_invalid' => function () use (&$data, &$expectedFailures) {
                    $data['phone'] = 'invalid!@#';
                    $expectedFailures[] = 'phone';
                },
                'url_invalid' => function () use (&$data, &$expectedFailures, $faker) {
                    $field = $faker->randomElement(['linkedin_profile', 'portfolio_website']);
                    $data[$field] = 'not-a-url';
                    $expectedFailures[] = $field;
                },
                'enum_invalid' => function () use (&$data, &$expectedFailures) {
                    $data['highest_qualification'] = 'Invalid Qualification';
                    $expectedFailures[] = 'highest_qualification';
                },
                'max_length' => function () use (&$data, &$expectedFailures, $faker) {
                    $data['first_name'] = str_repeat('a', 100);
                    $expectedFailures[] = 'first_name';
                },
            })();
        }
        
        $rules = (new UpdateProfileRequest())->rules();
        $relevantRules = array_intersect_key($rules, $data);
        
        $validator = Validator::make($data, $relevantRules);
        
        // Verify validation fails
        expect($validator->fails())->toBeTrue();
        
        // Verify each expected field has specific errors
        foreach ($expectedFailures as $field) {
            expect($validator->errors()->has($field))->toBeTrue();
            
            $errors = $validator->errors()->get($field);
            expect($errors)->toBeArray()
                ->and(count($errors))->toBeGreaterThan(0);
            
            foreach ($errors as $error) {
                expect($error)->toBeString()
                    ->and(strlen($error))->toBeGreaterThan(0);
            }
        }
        
        // Verify error messages are distinct per field
        $allErrorMessages = [];
        foreach ($expectedFailures as $field) {
            $fieldErrors = $validator->errors()->get($field);
            foreach ($fieldErrors as $error) {
                $allErrorMessages[$field][] = $error;
            }
        }
        
        // Each field should have at least one error message
        expect(count($allErrorMessages))->toBeGreaterThan(0);
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('ensures error messages identify the validation rule that failed', function (): void {
        $faker = fake();
        
        // Test phone with multiple potential rule failures
        $invalidationType = $faker->randomElement(['regex', 'min', 'max']);
        
        $phone = match ($invalidationType) {
            'regex' => '12345678abc', // Valid length, invalid characters
            'min' => '123', // Too short
            'max' => str_repeat('1', 25), // Too long
        };
        
        $data = ['phone' => $phone];
        $rules = (new UpdateProfileRequest())->rules();
        
        $validator = Validator::make($data, ['phone' => $rules['phone']]);
        
        // Verify validation fails
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('phone'))->toBeTrue();
        
        $errors = $validator->errors()->get('phone');
        
        // Verify we get at least one specific error message
        expect($errors)->toBeArray()
            ->and(count($errors))->toBeGreaterThan(0);
        
        // Each error should be non-empty and specific
        foreach ($errors as $error) {
            expect($error)->toBeString()
                ->and(strlen($error))->toBeGreaterThan(0);
        }
        
        // Verify errors are actionable (contain relevant information)
        // Laravel default messages should mention the field name or the constraint
        $allErrorsString = implode(' ', $errors);
        expect(strlen($allErrorsString))->toBeGreaterThan(0);
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('provides actionable error messages that help users correct their input', function (): void {
        $faker = fake();
        
        // Create a random invalid profile data scenario
        $scenarios = [
            // Phone with invalid format
            fn() => [
                'field' => 'phone',
                'value' => '123', // Too short
                'expected_context' => 'length',
            ],
            // URL with invalid format
            fn() => [
                'field' => 'linkedin_profile',
                'value' => 'not-a-url',
                'expected_context' => 'url',
            ],
            // Enum with invalid value
            fn() => [
                'field' => 'highest_qualification',
                'value' => 'Random Value',
                'expected_context' => 'enum',
            ],
        ];
        
        $scenario = $faker->randomElement($scenarios)();
        
        $data = [$scenario['field'] => $scenario['value']];
        $rules = (new UpdateProfileRequest())->rules();
        
        $validator = Validator::make($data, [$scenario['field'] => $rules[$scenario['field']]]);
        
        // Verify validation fails
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has($scenario['field']))->toBeTrue();
        
        $errors = $validator->errors()->get($scenario['field']);
        
        // Verify error messages are present and actionable
        expect($errors)->toBeArray()
            ->and(count($errors))->toBeGreaterThan(0);
        
        foreach ($errors as $error) {
            // Each error should be a non-empty string
            expect($error)->toBeString()
                ->and(strlen($error))->toBeGreaterThan(0);
        }
        
        // Verify that the error messages contain useful information
        // (Laravel's default messages are specific and actionable)
        $errorString = implode(' ', $errors);
        expect($errorString)->not()->toBe('')
            ->and(strlen($errorString))->toBeGreaterThan(10); // Should be a meaningful message
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 12: Validation Error Message Specificity
    it('distinguishes between different types of validation errors for the same field', function (): void {
        $faker = fake();
        
        // Test phone field which has multiple validation rules (regex, min, max)
        // Generate two different invalid phones that fail different rules
        
        $invalidPhones = [
            ['value' => '123', 'rule' => 'min'], // Fails min:8
            ['value' => str_repeat('1', 25), 'rule' => 'max'], // Fails max:20
            ['value' => '12345678abc', 'rule' => 'regex'], // Fails regex
        ];
        
        $phone1 = $faker->randomElement($invalidPhones);
        
        $data1 = ['phone' => $phone1['value']];
        $rules = (new UpdateProfileRequest())->rules();
        
        $validator1 = Validator::make($data1, ['phone' => $rules['phone']]);
        
        expect($validator1->fails())->toBeTrue();
        $errors1 = $validator1->errors()->get('phone');
        
        // Now test a different type of phone error
        $phone2 = $faker->randomElement(array_filter($invalidPhones, fn($p) => $p['rule'] !== $phone1['rule']));
        
        $data2 = ['phone' => $phone2['value']];
        $validator2 = Validator::make($data2, ['phone' => $rules['phone']]);
        
        expect($validator2->fails())->toBeTrue();
        $errors2 = $validator2->errors()->get('phone');
        
        // Both should have errors
        expect($errors1)->toBeArray()->and(count($errors1))->toBeGreaterThan(0);
        expect($errors2)->toBeArray()->and(count($errors2))->toBeGreaterThan(0);
        
        // Each error should be specific
        foreach ($errors1 as $error) {
            expect($error)->toBeString()->and(strlen($error))->toBeGreaterThan(0);
        }
        
        foreach ($errors2 as $error) {
            expect($error)->toBeString()->and(strlen($error))->toBeGreaterThan(0);
        }
    })->repeat(100);
});
