<?php

declare(strict_types=1);

namespace App\Services\Profile;

use App\Models\User;

/**
 * Single source of truth for profile completeness logic. Defines required profile fields,
 * calculates completion percentage, and determines missing fields. Used across controllers,
 * middleware, and API endpoints to enforce profile completion requirements.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 2.2, 2.3
 */
final class ProfileService
{
    /**
     * Required profile fields that must be completed before course applications.
     * Centralized definition allows easy modification without touching multiple files.
     *
     * @var array<string>
     */
    private const REQUIRED_FIELDS = [
        'name',
        'email',
        'phone',
        'country',
        'city',
        'highest_qualification',
    ];

    /**
     * Get list of required profile field names.
     *
     * Validates: Requirement 6.1
     *
     * @return array<string>
     */
    public function getRequiredFields(): array
    {
        return self::REQUIRED_FIELDS;
    }

    /**
     * Calculate profile completion percentage (0-100).
     *
     * Formula: (number of completed required fields / total required fields) × 100
     * A field is considered complete when it contains a non-null, non-empty value.
     *
     * Validates: Requirements 6.2, 2.1, 2.2, 2.3
     *
     * @param User $user
     * @return float
     */
    public function getCompletionPercentage(User $user): float
    {
        $totalRequired = count(self::REQUIRED_FIELDS);
        
        if ($totalRequired === 0) {
            return 100.0;
        }

        $completedCount = 0;

        foreach (self::REQUIRED_FIELDS as $field) {
            if ($this->isFieldCompleted($user, $field)) {
                $completedCount++;
            }
        }

        return round(($completedCount / $totalRequired) * 100, 2);
    }

    /**
     * Get list of missing required field names.
     *
     * Returns field names that are null or empty.
     *
     * Validates: Requirement 6.3
     *
     * @param User $user
     * @return array<string>
     */
    public function getMissingFields(User $user): array
    {
        $missing = [];

        foreach (self::REQUIRED_FIELDS as $field) {
            if (!$this->isFieldCompleted($user, $field)) {
                $missing[] = $field;
            }
        }

        return $missing;
    }

    /**
     * Check if profile is 100% complete.
     *
     * Returns true only when all required fields contain valid values.
     *
     * Validates: Requirement 6.4
     *
     * @param User $user
     * @return bool
     */
    public function isProfileComplete(User $user): bool
    {
        foreach (self::REQUIRED_FIELDS as $field) {
            if (!$this->isFieldCompleted($user, $field)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get detailed profile status with field completion state.
     *
     * Returns percentage, missing fields, and completed fields for comprehensive UI display.
     *
     * Validates: Requirement 6.5
     *
     * @param User $user
     * @return array{percentage: float, missing: array<string>, completed: array<string>}
     */
    public function getProfileStatus(User $user): array
    {
        $completed = [];
        $missing = [];

        foreach (self::REQUIRED_FIELDS as $field) {
            if ($this->isFieldCompleted($user, $field)) {
                $completed[] = $field;
            } else {
                $missing[] = $field;
            }
        }

        return [
            'percentage' => $this->getCompletionPercentage($user),
            'missing' => $missing,
            'completed' => $completed,
        ];
    }

    /**
     * Check if a specific field is completed (non-null, non-empty).
     *
     * Implements the completion criteria from Requirement 2.3.
     *
     * @param User $user
     * @param string $field
     * @return bool
     */
    private function isFieldCompleted(User $user, string $field): bool
    {
        $value = $user->{$field};

        // Field is incomplete if null
        if ($value === null) {
            return false;
        }

        // For string fields, check if non-empty after trimming whitespace
        if (is_string($value)) {
            return trim($value) !== '';
        }

        // For non-string values, presence indicates completion
        return true;
    }
}
