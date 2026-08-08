<?php

declare(strict_types=1);

namespace Tests\Unit\Models;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Test that User model can work with profile fields added for Progressive Student Profile Completion.
 * 
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4
 */
final class UserProfileFieldsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_model_includes_all_required_profile_fields_in_fillable(): void
    {
        $user = new User();
        $fillable = $user->getFillable();

        $requiredProfileFields = [
            'phone',
            'country',
            'city',
            'highest_qualification',
            'first_name',
            'last_name',
        ];

        foreach ($requiredProfileFields as $field) {
            $this->assertContains(
                $field,
                $fillable,
                "Required profile field '$field' should be in User model's fillable array"
            );
        }
    }

    public function test_user_model_includes_all_optional_profile_fields_in_fillable(): void
    {
        $user = new User();
        $fillable = $user->getFillable();

        $optionalProfileFields = [
            'bio',
            'occupation',
            'linkedin_profile',
            'portfolio_website',
        ];

        foreach ($optionalProfileFields as $field) {
            $this->assertContains(
                $field,
                $fillable,
                "Optional profile field '$field' should be in User model's fillable array"
            );
        }
    }

    public function test_user_can_be_created_with_all_profile_fields(): void
    {
        $userData = [
            'role' => 'student',
            'name' => 'John Doe',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@example.com',
            'password_hash' => bcrypt('password123'),
            'phone' => '+1234567890',
            'country' => 'United States',
            'city' => 'New York',
            'highest_qualification' => "Bachelor's Degree",
            'bio' => 'Software developer with 5 years of experience',
            'occupation' => 'Software Engineer',
            'linkedin_profile' => 'https://linkedin.com/in/johndoe',
            'portfolio_website' => 'https://johndoe.dev',
        ];

        $user = User::create($userData);

        $this->assertDatabaseHas('users', [
            'email' => 'john.doe@example.com',
            'phone' => '+1234567890',
            'country' => 'United States',
            'city' => 'New York',
            'highest_qualification' => "Bachelor's Degree",
            'occupation' => 'Software Engineer',
            'linkedin_profile' => 'https://linkedin.com/in/johndoe',
            'portfolio_website' => 'https://johndoe.dev',
        ]);

        $this->assertEquals('John', $user->first_name);
        $this->assertEquals('Doe', $user->last_name);
        $this->assertEquals('+1234567890', $user->phone);
        $this->assertEquals('United States', $user->country);
        $this->assertEquals('New York', $user->city);
        $this->assertEquals("Bachelor's Degree", $user->highest_qualification);
        $this->assertEquals('Software Engineer', $user->occupation);
        $this->assertEquals('https://linkedin.com/in/johndoe', $user->linkedin_profile);
        $this->assertEquals('https://johndoe.dev', $user->portfolio_website);
    }

    public function test_user_can_be_created_with_null_profile_fields(): void
    {
        $userData = [
            'role' => 'student',
            'name' => 'Jane Smith',
            'email' => 'jane.smith@example.com',
            'password_hash' => bcrypt('password123'),
            // All profile fields intentionally omitted (should be nullable)
        ];

        $user = User::create($userData);

        $this->assertDatabaseHas('users', [
            'email' => 'jane.smith@example.com',
        ]);

        $this->assertNull($user->phone);
        $this->assertNull($user->country);
        $this->assertNull($user->city);
        $this->assertNull($user->highest_qualification);
        $this->assertNull($user->bio);
        $this->assertNull($user->occupation);
        $this->assertNull($user->linkedin_profile);
        $this->assertNull($user->portfolio_website);
    }

    public function test_existing_user_profile_fields_can_be_updated(): void
    {
        $user = User::create([
            'role' => 'student',
            'name' => 'Initial Name',
            'email' => 'user@example.com',
            'password_hash' => bcrypt('password123'),
        ]);

        // Update profile fields
        $user->update([
            'first_name' => 'Updated',
            'last_name' => 'Name',
            'phone' => '+9876543210',
            'country' => 'Canada',
            'city' => 'Toronto',
            'highest_qualification' => "Master's Degree",
            'bio' => 'Updated bio',
            'occupation' => 'Data Scientist',
            'linkedin_profile' => 'https://linkedin.com/in/updated',
            'portfolio_website' => 'https://updated.com',
        ]);

        $user->refresh();

        $this->assertEquals('Updated', $user->first_name);
        $this->assertEquals('Name', $user->last_name);
        $this->assertEquals('+9876543210', $user->phone);
        $this->assertEquals('Canada', $user->country);
        $this->assertEquals('Toronto', $user->city);
        $this->assertEquals("Master's Degree", $user->highest_qualification);
        $this->assertEquals('Updated bio', $user->bio);
        $this->assertEquals('Data Scientist', $user->occupation);
        $this->assertEquals('https://linkedin.com/in/updated', $user->linkedin_profile);
        $this->assertEquals('https://updated.com', $user->portfolio_website);
    }
}
