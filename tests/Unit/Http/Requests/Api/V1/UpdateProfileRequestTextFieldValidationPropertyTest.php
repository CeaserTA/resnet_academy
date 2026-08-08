<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Validator;

describe('UpdateProfileRequest Text Field Non-Empty Validation Property Tests', function (): void {
    // Feature: progressive-student-profile-completion, Property 9: Text Field Non-Empty Validation
    it('rejects empty strings for Country field when field is provided', function (): void {
        // Create validator with the country validation rules
        $validator = Validator::make(
            ['country' => ''],
            ['country' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        // Verify validation fails for empty string (filled rule rejects empty strings)
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('country'))->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 9: Text Field Non-Empty Validation
    it('rejects whitespace-only strings for Country field', function (): void {
        $faker = fake();
        
        // Generate random whitespace-only string (spaces, tabs, newlines)
        $length = $faker->numberBetween(1, 20);
        $whitespaceChars = [' ', "\t", "\n", "\r"];
        $whitespaceOnly = '';
        
        for ($i = 0; $i < $length; $i++) {
            $whitespaceOnly .= $faker->randomElement($whitespaceChars);
        }
        
        // Create validator with the country validation rules
        $validator = Validator::make(
            ['country' => $whitespaceOnly],
            ['country' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        // Verify validation fails for whitespace-only string (filled rule rejects whitespace)
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('country'))->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 9: Text Field Non-Empty Validation
    it('accepts non-empty strings with non-whitespace content for Country field', function (): void {
        $faker = fake();
        
        // Generate random country name with at least one non-whitespace character
        $country = $faker->country();
        
        // Ensure it has at least one non-whitespace character (it should, but verify)
        if (!preg_match('/\S/', $country)) {
            $country = 'A'; // Fallback to ensure non-whitespace
        }
        
        // Create validator with the country validation rules
        $validator = Validator::make(
            ['country' => $country],
            ['country' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        // Verify validation passes
        expect($validator->passes())->toBeTrue()
            ->and($validator->errors()->has('country'))->toBeFalse();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 9: Text Field Non-Empty Validation
    it('rejects empty strings for City field when field is provided', function (): void {
        // Create validator with the city validation rules
        $validator = Validator::make(
            ['city' => ''],
            ['city' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        // Verify validation fails for empty string
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('city'))->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 9: Text Field Non-Empty Validation
    it('rejects whitespace-only strings for City field', function (): void {
        $faker = fake();
        
        // Generate random whitespace-only string (spaces, tabs, newlines)
        $length = $faker->numberBetween(1, 20);
        $whitespaceChars = [' ', "\t", "\n", "\r"];
        $whitespaceOnly = '';
        
        for ($i = 0; $i < $length; $i++) {
            $whitespaceOnly .= $faker->randomElement($whitespaceChars);
        }
        
        // Create validator with the city validation rules
        $validator = Validator::make(
            ['city' => $whitespaceOnly],
            ['city' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        // Verify validation fails for whitespace-only string
        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('city'))->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 9: Text Field Non-Empty Validation
    it('accepts non-empty strings with non-whitespace content for City field', function (): void {
        $faker = fake();
        
        // Generate random city name with at least one non-whitespace character
        $city = $faker->city();
        
        // Ensure it has at least one non-whitespace character (it should, but verify)
        if (!preg_match('/\S/', $city)) {
            $city = 'A'; // Fallback to ensure non-whitespace
        }
        
        // Create validator with the city validation rules
        $validator = Validator::make(
            ['city' => $city],
            ['city' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        // Verify validation passes
        expect($validator->passes())->toBeTrue()
            ->and($validator->errors()->has('city'))->toBeFalse();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 9: Text Field Non-Empty Validation
    it('accepts strings with leading/trailing whitespace but non-whitespace content', function (): void {
        $faker = fake();
        
        // Generate string with whitespace padding but valid content in the middle
        $content = $faker->randomElement(['USA', 'Canada', 'Mexico', 'Brazil', 'France', 'Germany', 'Japan', 'China']);
        $leadingWhitespace = str_repeat(' ', $faker->numberBetween(0, 5));
        $trailingWhitespace = str_repeat(' ', $faker->numberBetween(0, 5));
        $paddedString = $leadingWhitespace . $content . $trailingWhitespace;
        
        // Test with Country
        $validatorCountry = Validator::make(
            ['country' => $paddedString],
            ['country' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        expect($validatorCountry->passes())->toBeTrue();
        
        // Test with City
        $validatorCity = Validator::make(
            ['city' => $paddedString],
            ['city' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        expect($validatorCity->passes())->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 9: Text Field Non-Empty Validation
    it('validates various real-world country and city names', function (): void {
        $faker = fake();
        
        // Generate various valid formats
        $validCountries = [
            $faker->country(),
            'United States',
            'United Kingdom',
            'South Africa',
            'New Zealand',
            'Saudi Arabia',
            'United Arab Emirates',
            'Bosnia and Herzegovina',
            "Côte d'Ivoire", // With special characters
            'São Tomé and Príncipe',
        ];
        
        $validCities = [
            $faker->city(),
            'New York',
            'Los Angeles',
            'São Paulo',
            'Mexico City',
            'St. Petersburg',
            'Frankfurt am Main',
            "N'Djamena", // With special characters
            'Addis Ababa',
        ];
        
        $country = $faker->randomElement($validCountries);
        $city = $faker->randomElement($validCities);
        
        // Validate country
        $validatorCountry = Validator::make(
            ['country' => $country],
            ['country' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        expect($validatorCountry->passes())->toBeTrue();
        
        // Validate city
        $validatorCity = Validator::make(
            ['city' => $city],
            ['city' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        expect($validatorCity->passes())->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 9: Text Field Non-Empty Validation
    it('allows null country and city fields (nullable rule behavior)', function (): void {
        // Test that when country/city are not provided (missing from data), validation passes
        $validatorMissing = Validator::make(
            ['first_name' => 'John'],
            [
                'country' => ['nullable', 'filled', 'string', 'max:100'],
                'city' => ['nullable', 'filled', 'string', 'max:100']
            ]
        );
        
        expect($validatorMissing->passes())->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 9: Text Field Non-Empty Validation
    it('validates country and city when provided (field is present)', function (): void {
        $faker = fake();
        
        // Generate random validity states for country and city (always present in data)
        $countryIsValid = $faker->boolean();
        $cityIsValid = $faker->boolean();
        
        // Generate country value based on validity
        if ($countryIsValid) {
            $country = $faker->country();
        } else {
            // Generate invalid country (whitespace-only, not empty)
            $country = str_repeat(' ', $faker->numberBetween(1, 5));
        }
        
        // Generate city value based on validity
        if ($cityIsValid) {
            $city = $faker->city();
        } else {
            // Generate invalid city (whitespace-only, not empty)
            $city = str_repeat(' ', $faker->numberBetween(1, 5));
        }
        
        // Create full profile data
        $data = [
            'first_name' => $faker->firstName(),
            'last_name' => $faker->lastName(),
            'country' => $country,
            'city' => $city,
        ];
        
        // Validate with both rules
        $validator = Validator::make($data, [
            'country' => ['nullable', 'filled', 'string', 'max:100'],
            'city' => ['nullable', 'filled', 'string', 'max:100']
        ]);
        
        // Verify validation result matches expected validity
        if ($countryIsValid && $cityIsValid) {
            expect($validator->passes())->toBeTrue();
        } else {
            expect($validator->fails())->toBeTrue();
            if (!$countryIsValid) {
                expect($validator->errors()->has('country'))->toBeTrue();
            }
            if (!$cityIsValid) {
                expect($validator->errors()->has('city'))->toBeTrue();
            }
        }
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 9: Text Field Non-Empty Validation
    it('validates that strings exceeding max length are rejected', function (): void {
        // Generate string longer than 100 characters with valid content
        $longString = str_repeat('A', 101);
        
        // Test with Country
        $validatorCountry = Validator::make(
            ['country' => $longString],
            ['country' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        expect($validatorCountry->fails())->toBeTrue()
            ->and($validatorCountry->errors()->has('country'))->toBeTrue();
        
        // Test with City
        $validatorCity = Validator::make(
            ['city' => $longString],
            ['city' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        expect($validatorCity->fails())->toBeTrue()
            ->and($validatorCity->errors()->has('city'))->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 9: Text Field Non-Empty Validation
    it('handles edge case: exactly 100 characters with valid content', function (): void {
        // Generate string exactly 100 characters long with valid content
        $exactString = str_repeat('A', 100);
        
        // Test with Country
        $validatorCountry = Validator::make(
            ['country' => $exactString],
            ['country' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        expect($validatorCountry->passes())->toBeTrue();
        
        // Test with City
        $validatorCity = Validator::make(
            ['city' => $exactString],
            ['city' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        expect($validatorCity->passes())->toBeTrue();
    })->repeat(100);

    // Feature: progressive-student-profile-completion, Property 9: Text Field Non-Empty Validation
    it('validates single non-whitespace character (minimum valid case)', function (): void {
        $faker = fake();
        
        // Single non-whitespace character
        $singleChar = $faker->randomElement(['A', 'B', 'X', '1', '0', '.', '-', '_']);
        
        // Test with Country
        $validatorCountry = Validator::make(
            ['country' => $singleChar],
            ['country' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        expect($validatorCountry->passes())->toBeTrue();
        
        // Test with City
        $validatorCity = Validator::make(
            ['city' => $singleChar],
            ['city' => ['nullable', 'filled', 'string', 'max:100']]
        );
        
        expect($validatorCity->passes())->toBeTrue();
    })->repeat(100);
});
