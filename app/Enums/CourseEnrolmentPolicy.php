<?php

declare(strict_types=1);

namespace App\Enums;

enum CourseEnrolmentPolicy: string
{
    case Open = 'open';
    case Advisory = 'advisory';
    case Application = 'application';

    /**
     * The admin course form defaults to this per level (and lets an admin override it) —
     * mirrored here so course creation still gets the right policy when a caller (script, test,
     * future integration) creates a course without specifying one at all.
     */
    public static function defaultForLevel(CourseLevel $level): self
    {
        return match ($level) {
            CourseLevel::Beginner => self::Open,
            CourseLevel::Intermediate => self::Advisory,
            CourseLevel::Advanced => self::Application,
        };
    }
}
