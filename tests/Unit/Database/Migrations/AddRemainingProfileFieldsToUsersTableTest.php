<?php

declare(strict_types=1);

namespace Tests\Unit\Database\Migrations;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Test the migration that adds remaining profile fields to the users table.
 * 
 * Validates: Requirements 11.1, 11.3, 11.4
 */
final class AddRemainingProfileFieldsToUsersTableTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_adds_all_expected_columns(): void
    {
        // After RefreshDatabase runs all migrations, these columns should exist
        $this->assertTrue(
            Schema::hasColumn('users', 'highest_qualification'),
            'highest_qualification column should exist in users table'
        );

        $this->assertTrue(
            Schema::hasColumn('users', 'occupation'),
            'occupation column should exist in users table'
        );

        $this->assertTrue(
            Schema::hasColumn('users', 'linkedin_profile'),
            'linkedin_profile column should exist in users table'
        );

        $this->assertTrue(
            Schema::hasColumn('users', 'portfolio_website'),
            'portfolio_website column should exist in users table'
        );
    }

    public function test_all_new_columns_are_nullable(): void
    {
        // Get column details from information schema
        $columns = \DB::select(
            "SELECT COLUMN_NAME, IS_NULLABLE 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'users' 
             AND COLUMN_NAME IN ('highest_qualification', 'occupation', 'linkedin_profile', 'portfolio_website')"
        );

        $this->assertCount(4, $columns, 'Should have 4 new columns');

        foreach ($columns as $column) {
            $this->assertEquals(
                'YES',
                $column->IS_NULLABLE,
                "Column {$column->COLUMN_NAME} should be nullable to support existing users"
            );
        }
    }

    public function test_phone_column_has_index(): void
    {
        // Check if index exists on phone column
        $indexes = \DB::select("SHOW INDEXES FROM users WHERE Column_name = 'phone'");

        $this->assertNotEmpty($indexes, 'phone column should have an index');

        // Check if the index name matches what we expect
        $indexNames = array_column($indexes, 'Key_name');
        $this->assertContains(
            'idx_users_phone',
            $indexNames,
            'Index on phone column should be named idx_users_phone'
        );
    }

    public function test_highest_qualification_column_has_correct_size(): void
    {
        $columnType = \DB::select(
            "SELECT CHARACTER_MAXIMUM_LENGTH 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'users' 
             AND COLUMN_NAME = 'highest_qualification'"
        );

        $this->assertEquals(
            100,
            $columnType[0]->CHARACTER_MAXIMUM_LENGTH,
            'highest_qualification should be VARCHAR(100)'
        );
    }

    public function test_occupation_column_has_correct_size(): void
    {
        $columnType = \DB::select(
            "SELECT CHARACTER_MAXIMUM_LENGTH 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'users' 
             AND COLUMN_NAME = 'occupation'"
        );

        $this->assertEquals(
            150,
            $columnType[0]->CHARACTER_MAXIMUM_LENGTH,
            'occupation should be VARCHAR(150)'
        );
    }

    public function test_url_columns_have_correct_size(): void
    {
        $urlColumns = ['linkedin_profile', 'portfolio_website'];

        foreach ($urlColumns as $columnName) {
            $columnType = \DB::select(
                "SELECT CHARACTER_MAXIMUM_LENGTH 
                 FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = 'users' 
                 AND COLUMN_NAME = ?",
                [$columnName]
            );

            $this->assertEquals(
                500,
                $columnType[0]->CHARACTER_MAXIMUM_LENGTH,
                "$columnName should be VARCHAR(500)"
            );
        }
    }
}
