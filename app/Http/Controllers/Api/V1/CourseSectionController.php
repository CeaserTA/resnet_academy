<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreSectionRequest;
use App\Http\Requests\Api\V1\UpdateSectionRequest;
use App\Http\Resources\CourseSectionResource;
use App\Models\Course;
use App\Models\CourseSection;
use App\Services\Enrolment\CourseSectionService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class CourseSectionController extends Controller
{
    public function __construct(
        private readonly CourseSectionService $sectionService,
    ) {}

    /**
     * Get publicly visible sections (open and in_progress) across all courses.
     * Used for landing page and catalogue page cohort displays.
     *
     * No authentication required.
     */
    public function public(): AnonymousResourceCollection
    {
        $sections = CourseSection::query()
            ->whereIn('status', ['open', 'in_progress'])
            ->with([
                'course.category',
                'course.instructors',
                'primaryInstructor',
            ])
            ->withCount([
                'enrolments as enrolled_count' => function ($query) {
                    $query->whereIn('status', ['confirmed', 'waitlisted']);
                },
            ])
            ->orderByRaw("
                CASE 
                    WHEN status = 'in_progress' THEN 1
                    WHEN status = 'open' THEN 2
                    ELSE 3
                END
            ")
            ->orderBy('start_date', 'asc')
            ->get();

        return CourseSectionResource::collection($sections);
    }

    /**
     * List all sections for a course.
     *
     * Public (unauthenticated) callers get a student-safe subset — name, dates, capacity,
     * instructor name, status, is_full, is_accepting_applications.
     * Admin/instructor callers also get enrolled_count, waitlisted_count, and
     * applications_pending_count (loaded only when the caller passes viewAnalytics).
     */
    public function index(Course $course): AnonymousResourceCollection
    {
        $user = auth()->user();
        $isPrivileged = $user !== null && $this->canViewAnalytics($user, $course);

        $query = $course->sections()->with('primaryInstructor')->orderBy('start_date', 'desc');

        if ($isPrivileged) {
            $query->with(['enrolments', 'applications']);
        }

        return CourseSectionResource::collection($query->get());
    }

    private function canViewAnalytics(\App\Models\User $user, Course $course): bool
    {
        return $user->role->value === 'admin'
            || ($user->role->value === 'instructor' && $course->isTaughtBy($user));
    }

    /**
     * Create a new section for a course.
     */
    public function store(StoreSectionRequest $request, Course $course): CourseSectionResource
    {
        $this->authorize('update', $course);

        $section = $this->sectionService->create(
            courseId: $course->id,
            data: $request->validated(),
            actorId: $request->user()->id,
        );

        return new CourseSectionResource($section->load(['primaryInstructor', 'enrolments', 'applications']));
    }

    /**
     * Show a single section with details.
     */
    public function show(CourseSection $section): CourseSectionResource
    {
        $this->authorize('view', $section);

        $section->load(['primaryInstructor', 'enrolments', 'applications']);

        return new CourseSectionResource($section);
    }

    /**
     * Update a section.
     */
    public function update(UpdateSectionRequest $request, CourseSection $section): CourseSectionResource
    {
        $this->authorize('update', $section);

        $section = $this->sectionService->update(
            section: $section,
            data: $request->validated(),
            actorId: $request->user()->id,
        );

        return new CourseSectionResource($section->load(['primaryInstructor', 'enrolments', 'applications']));
    }

    /**
     * Delete a section (only if no enrollments or applications).
     */
    public function destroy(CourseSection $section): Response
    {
        $this->authorize('delete', $section);

        $this->sectionService->delete(
            section: $section,
            actorId: $this->user()->id,
        );

        return response()->noContent();
    }

    private function user(): \App\Models\User
    {
        return auth()->user();
    }
}
