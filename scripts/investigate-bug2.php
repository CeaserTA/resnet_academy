<?php

/**
 * Bug 2 Investigation Helper Script
 * 
 * Run: php scripts/investigate-bug2.php
 * 
 * This script helps automate Step 2 (database verification) after you manually
 * submit an application through the UI.
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\CourseApplication;
use App\Models\User;
use Illuminate\Support\Facades\DB;

echo "=== Bug 2 Investigation: Database Verification ===\n\n";

// Get the student email from command line or prompt
$email = $argv[1] ?? null;
if (!$email) {
    echo "Usage: php scripts/investigate-bug2.php <student-email>\n";
    echo "Example: php scripts/investigate-bug2.php student@example.com\n\n";
    exit(1);
}

$student = User::where('email', $email)->first();
if (!$student) {
    echo "❌ Student not found with email: {$email}\n";
    exit(1);
}

echo "✅ Found student: {$student->name} (ID: {$student->id})\n\n";

// Get the most recent application
$latestApplication = CourseApplication::where('student_id', $student->id)
    ->with(['course', 'section'])
    ->orderBy('created_at', 'desc')
    ->first();

if (!$latestApplication) {
    echo "❌ No applications found for this student\n";
    exit(1);
}

echo "=== Most Recent Application ===\n";
echo "ID: {$latestApplication->id}\n";
echo "Course: {$latestApplication->course->title} (ID: {$latestApplication->course_id})\n";
echo "Section ID: " . ($latestApplication->section_id ?? 'NULL') . "\n";
if ($latestApplication->section) {
    echo "Section Name: {$latestApplication->section->name}\n";
    echo "Section Status: {$latestApplication->section->status->value}\n";
}
echo "Status: {$latestApplication->status->value}\n";
echo "Created At: {$latestApplication->created_at}\n";
echo "Updated At: {$latestApplication->updated_at}\n\n";

// Get all applications for this student
$allApplications = CourseApplication::where('student_id', $student->id)
    ->with(['course', 'section'])
    ->orderBy('created_at', 'desc')
    ->get();

echo "=== All Applications for this Student ===\n";
echo "Total: {$allApplications->count()}\n\n";

foreach ($allApplications as $app) {
    $sectionInfo = $app->section_id ? "Section: {$app->section_id}" : "Self-paced";
    echo "- [{$app->status->value}] {$app->course->title} ({$sectionInfo}) - {$app->created_at}\n";
}

echo "\n=== Testing visibleForDashboard() Method ===\n";

// This simulates what the API endpoint does
$service = app(\App\Services\Enrolment\CourseApplicationService::class);
$visibleApplications = $service->visibleForDashboard($student);

echo "Applications returned by visibleForDashboard(): {$visibleApplications->count()}\n\n";

if ($visibleApplications->isEmpty()) {
    echo "❌ WARNING: visibleForDashboard() returned EMPTY collection!\n";
    echo "   This means the dashboard query is filtering out all applications.\n\n";
} else {
    echo "✅ Applications visible on dashboard:\n";
    foreach ($visibleApplications as $app) {
        $sectionInfo = $app->section_id ? "Section: {$app->section_id}" : "Self-paced";
        echo "  - [{$app->status->value}] {$app->course->title} ({$sectionInfo})\n";
    }
}

// Check if the latest application is in the visible list
$latestIsVisible = $visibleApplications->contains('id', $latestApplication->id);
echo "\n";
if ($latestIsVisible) {
    echo "✅ Latest application IS visible in dashboard query\n";
} else {
    echo "❌ Latest application is NOT visible in dashboard query\n";
    echo "   Status: {$latestApplication->status->value}\n";
    echo "   Dismissed: " . ($latestApplication->dismissed_at ? "Yes" : "No") . "\n";
    
    if ($latestApplication->status->value === 'rejected' && $latestApplication->reviewed_at) {
        $daysSinceReview = now()->diffInDays($latestApplication->reviewed_at);
        echo "   Days since review: {$daysSinceReview}\n";
        echo "   (Rejected apps expire after 14 days)\n";
    }
}

echo "\n=== Investigation Complete ===\n";
echo "Next: Test the API endpoint (Step 3 in BUG2_INVESTIGATION.md)\n";
