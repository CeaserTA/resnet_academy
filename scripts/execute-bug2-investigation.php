<?php

/**
 * Execute Bug 2 Investigation - ACTUAL RUNTIME TEST
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Course;
use App\Models\CourseSection;
use App\Models\User;
use App\Services\Enrolment\CourseApplicationService;
use App\Enums\CourseSectionStatus;
use Illuminate\Support\Facades\DB;

echo "=== BUG 2 INVESTIGATION - ACTUAL EXECUTION ===\n\n";

// STEP 1: Find or create test data
echo "STEP 1: Setting up test data\n";
echo "----------------------------\n";

$student = User::where('role', 'student')->first();
if (!$student) {
    echo "❌ No student users found in database\n";
    exit(1);
}
echo "✅ Student: {$student->name} (ID: {$student->id}, Email: {$student->email})\n";

$course = Course::where('enrolment_policy', 'application')
    ->where('sections_required', false)
    ->first();

if (!$course) {
    echo "⚠️  No existing course with application policy and sections_required=false, creating one...\n";
    $course = Course::factory()->create([
        'enrolment_policy' => 'application',
        'sections_required' => false,
        'status' => 'published',
    ]);
}
echo "✅ Course: {$course->title} (ID: {$course->id})\n";
echo "   - enrolment_policy: {$course->enrolment_policy->value}\n";
echo "   - sections_required: " . ($course->sections_required ? 'true' : 'false') . "\n";

$section = CourseSection::where('course_id', $course->id)
    ->where('status', CourseSectionStatus::Open)
    ->first();

if (!$section) {
    echo "⚠️  No open section for this course, creating one...\n";
    $section = CourseSection::factory()->create([
        'course_id' => $course->id,
        'status' => CourseSectionStatus::Open,
        'capacity' => 30,
        'start_date' => now()->addWeeks(2),
        'end_date' => now()->addWeeks(10),
    ]);
}
echo "✅ Section: {$section->name} (ID: {$section->id}, Status: {$section->status->value})\n\n";

// STEP 2: Create application via service (simulating API request)
echo "STEP 2: Creating application via CourseApplicationService::apply()\n";
echo "-------------------------------------------------------------------\n";

$applicationService = app(CourseApplicationService::class);

try {
    $application = $applicationService->apply(
        student: $student,
        course: $course,
        answers: ['Test answer 1', 'Test answer 2'],
        portfolioUrl: 'https://example.com/portfolio',
        alternativeProofText: 'Test alternative proof',
        sectionId: $section->id
    );
    
    echo "✅ Application created successfully!\n";
    echo "   - Application ID: {$application->id}\n";
    echo "   - Course ID: {$application->course_id}\n";
    echo "   - Section ID: " . ($application->section_id ?? 'NULL') . "\n";
    echo "   - Status: {$application->status->value}\n";
    echo "   - Created: {$application->created_at}\n\n";
    
} catch (\Exception $e) {
    echo "❌ Application creation FAILED: {$e->getMessage()}\n";
    exit(1);
}

// STEP 3: Query database directly
echo "STEP 3: Querying database directly\n";
echo "-----------------------------------\n";

$dbRow = DB::table('course_applications')
    ->where('id', $application->id)
    ->first();

if (!$dbRow) {
    echo "❌ Row NOT FOUND in database!\n";
    exit(1);
}

echo "✅ Database row exists:\n";
foreach ((array)$dbRow as $col => $val) {
    $displayVal = $val === null ? 'NULL' : (is_string($val) ? $val : json_encode($val));
    echo "   - {$col}: {$displayVal}\n";
}
echo "\n";

// STEP 4: Test visibleForDashboard() method
echo "STEP 4: Testing CourseApplicationService::visibleForDashboard()\n";
echo "---------------------------------------------------------------\n";

$visibleApplications = $applicationService->visibleForDashboard($student);

echo "Applications returned: {$visibleApplications->count()}\n";

if ($visibleApplications->isEmpty()) {
    echo "❌ CRITICAL: visibleForDashboard() returned EMPTY collection!\n";
    echo "   The application we just created is NOT visible.\n";
    echo "   This is the BUG - the query is filtering it out.\n\n";
    
    echo "DEBUG: Application details:\n";
    echo "   - Status: {$application->status->value}\n";
    echo "   - Dismissed: " . ($application->dismissed_at ? 'Yes' : 'No') . "\n";
    echo "   - Section ID: " . ($application->section_id ?? 'NULL') . "\n\n";
    
} else {
    echo "✅ Applications visible:\n";
    foreach ($visibleApplications as $app) {
        $sectionInfo = $app->section_id ? "Section: {$app->section_id}" : "Self-paced";
        echo "   - [{$app->status->value}] {$app->course->title} ({$sectionInfo})\n";
    }
    
    $ourAppIsVisible = $visibleApplications->contains('id', $application->id);
    echo "\n";
    if ($ourAppIsVisible) {
        echo "✅ Our application IS in the visible list\n\n";
    } else {
        echo "❌ Our application is NOT in the visible list\n";
        echo "   Even though visibleForDashboard() returned results, ours is missing.\n\n";
    }
}

echo "=== INVESTIGATION COMPLETE ===\n";
echo "Summary:\n";
echo "- Application created: " . ($application ? 'YES' : 'NO') . "\n";
echo "- Database row exists: " . ($dbRow ? 'YES' : 'NO') . "\n";
echo "- Visible in dashboard query: " . ($visibleApplications->contains('id', $application->id ?? 0) ? 'YES' : 'NO') . "\n";
