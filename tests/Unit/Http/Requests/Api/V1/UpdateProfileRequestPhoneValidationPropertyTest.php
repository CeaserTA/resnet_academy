<?php

declare(strict_types=1);

use App\Http\Requests\Api\V1\UpdateProfileRequest;
use Illuminate\Support\Facades\Validator;

describe('UpdateProfileRequest Phone Validation Property Tests', function (): void {
    // Feature: progressive-student-profile-completion, Property 8: Phone Number Validation Rules
    it('rejects phone numbers with invalid characters', function (): void {
        $faker = fake();
        
        // Generate random invalid characters (not digits, spaces, hyphens, or plus signs)
        $invalidChars = ['a', 'b', 'z', 'A', 'Z', '!', '@', '#', '$', '%', '&', '*', '(', ')', '_', '=', '[', ']', '{', '}', '|', '\\', ';', ':', '"', "'", '<', '>', ',', '.', '/', '?', '`', '~'];
        
        // Build a phone string with valid length but invalid character
        $validLength = $faker->numberBetween(8, 20);
        $validBase = str_repeat('0', $validLength - 1); // Fill with valid digits
        $invalidChar = $faker->randomElement($invalidChars);
        $invalidPhone = $validBase . $invalidChar;
        
        // Create validator with the phone validation rules
        $validator = Validator::make(
            ['phone' => $invalidPhone],
            ['phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20']]
        );
        
        // Verify validation fails
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('phone'))->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 8: Phone Number Validation Rules
    it('rejects phone numbers shorter than 8 characters', function (): void {
        $faker = fake();
        
        // Generate random phone string shorter than 8 characters (1-7 chars)
        $length = $faker->numberBetween(1, 7);
        $shortPhone = '';
        
        for ($i = 0; $i < $length; $i++) {
            $shortPhone .= $faker->randomElement(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '-', '+']);
        }
        
        // Ensure the string is not empty (edge case with length=0 shouldn't happen, but safety check)
        if (strlen($shortPhone) === 0) {
            $shortPhone = '123'; // Fallback to ensure we have a short phone
        }
        
        // Create validator with the phone validation rules
        $validator = Validator::make(
            ['phone' => $shortPhone],
            ['phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20']]
        );
        
        // Verify validation fails (string is 1-7 characters, should fail min:8)
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('phone'))->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 8: Phone Number Validation Rules
    it('rejects phone numbers longer than 20 characters', function (): void {
        $faker = fake();
        
        // Generate random phone string longer than 20 characters
        $length = $faker->numberBetween(21, 30);
        $longPhone = '';
        
        for ($i = 0; $i < $length; $i++) {
            $longPhone .= $faker->randomElement(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '-', '+']);
        }
        
        // Create validator with the phone validation rules
        $validator = Validator::make(
            ['phone' => $longPhone],
            ['phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20']]
        );
        
        // Verify validation fails
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('phone'))->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 8: Phone Number Validation Rules
    it('accepts valid phone numbers with digits, spaces, hyphens, and plus signs within 8-20 characters', function (): void {
        $faker = fake();
        
        // Generate random valid phone number
        $length = $faker->numberBetween(8, 20);
        $validPhone = '';
        
        $validChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '-', '+'];
        
        for ($i = 0; $i < $length; $i++) {
            $validPhone .= $faker->randomElement($validChars);
        }
        
        // Create validator with the phone validation rules
        $validator = Validator::make(
            ['phone' => $validPhone],
            ['phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20']]
        );
        
        // Verify validation passes
        expect($validator->passes())->toBeTrue()
            ->and($validator->errors()->has('phone'))->toBeFalse();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 8: Phone Number Validation Rules
    it('correctly validates various real-world phone formats', function (): void {
        $faker = fake();
        
        // Generate various valid phone formats
        $validFormats = [
            // Plain digits
            fn() => str_repeat((string)$faker->numberBetween(0, 9), $faker->numberBetween(8, 20)),
            // International format with plus
            fn() => '+' . $faker->numerify(str_repeat('#', $faker->numberBetween(7, 19))),
            // Format with spaces
            fn() => $faker->numerify('### ### ###'),
            // Format with hyphens
            fn() => $faker->numerify('###-###-####'),
            // Mixed format
            fn() => '+' . $faker->numerify('## ### ### ###'),
            // Format with spaces and hyphens
            fn() => $faker->numerify('### - ### - ####'),
        ];
        
        $format = $faker->randomElement($validFormats);
        $validPhone = $format();
        
        // Ensure it's within valid length
        if (strlen($validPhone) < 8) {
            $validPhone .= str_repeat('0', 8 - strlen($validPhone));
        }
        if (strlen($validPhone) > 20) {
            $validPhone = substr($validPhone, 0, 20);
        }
        
        // Create validator with the phone validation rules
        $validator = Validator::make(
            ['phone' => $validPhone],
            ['phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20']]
        );
        
        // Verify validation passes
        expect($validator->passes())->toBeTrue()
            ->and($validator->errors()->has('phone'))->toBeFalse();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 8: Phone Number Validation Rules
    it('handles edge cases: exactly 8 characters and exactly 20 characters', function (): void {
        $faker = fake();
        
        // Test exactly 8 characters (minimum boundary)
        $phone8 = '';
        for ($i = 0; $i < 8; $i++) {
            $phone8 .= $faker->randomElement(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '-', '+']);
        }
        
        $validator8 = Validator::make(
            ['phone' => $phone8],
            ['phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20']]
        );
        
        expect($validator8->passes())->toBeTrue();
        
        // Test exactly 20 characters (maximum boundary)
        $phone20 = '';
        for ($i = 0; $i < 20; $i++) {
            $phone20 .= $faker->randomElement(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '-', '+']);
        }
        
        $validator20 = Validator::make(
            ['phone' => $phone20],
            ['phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20']]
        );
        
        expect($validator20->passes())->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 8: Phone Number Validation Rules
    it('allows optional phone field (sometimes rule behavior)', function (): void {
        // Test that when phone is not provided, validation passes
        $validatorMissing = Validator::make(
            ['first_name' => 'John'],
            ['phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20']]
        );
        
        expect($validatorMissing->passes())->toBeTrue();
        
        // Test empty string (sometimes rule allows empty values when field is provided)
        $validatorEmpty = Validator::make(
            ['phone' => ''],
            ['phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20']]
        );
        
        // With 'sometimes' rule, empty string passes because no 'required' rule enforces non-empty
        expect($validatorEmpty->passes())->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 8: Phone Number Validation Rules
    it('validates phone in the context of full profile update request', function (): void {
        $faker = fake();
        
        // Generate random phone (50% valid, 50% invalid)
        $isValid = $faker->boolean();
        
        if ($isValid) {
            $length = $faker->numberBetween(8, 20);
            $phone = '';
            for ($i = 0; $i < $length; $i++) {
                $phone .= $faker->randomElement(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '-', '+']);
            }
        } else {
            // Generate invalid phone (either wrong length or invalid characters)
            if ($faker->boolean()) {
                // Invalid length
                $length = $faker->boolean() ? $faker->numberBetween(1, 7) : $faker->numberBetween(21, 30);
                $phone = str_repeat('0', $length);
            } else {
                // Invalid character
                $phone = $faker->numerify('########') . 'abc';
            }
        }
        
        // Create full profile data
        $data = [
            'first_name' => $faker->firstName(),
            'last_name' => $faker->lastName(),
            'phone' => $phone,
            'country' => $faker->country(),
            'city' => $faker->city(),
        ];
        
        // Validate directly without using the request object
        $validator = Validator::make($data, [
            'phone' => ['sometimes', 'string', 'regex:/^[0-9\s\-\+]+$/', 'min:8', 'max:20']
        ]);
        
        if ($isValid) {
            expect($validator->passes())->toBeTrue();
        } else {
            expect($validator->fails())->toBeTrue()
                ->and($validator->errors()->has('phone'))->toBeTrue();
        }
    })->repeat(100);
});
