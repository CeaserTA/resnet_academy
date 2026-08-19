<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Enums\ModuleProgressStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminEnrolmentResource;
use App\Models\Enrolment;
use App\Models\ModuleProgress;
use App\Services\Enrolment\EnrolmentService;
use App\Services\Progress\ProgressEngine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

final class EnrolmentController extends Controller
{
    public function __construct(
        private readonly EnrolmentService $enrolmentService,
        private readonly ProgressEngine $progressEngine,
    ) {}

    /**
     * The admin roster — every enrolment across instant (open/advisory) and approved
     * application enrolments. Instructors see only enrolments for courses they teach
     * (same scoping split as CourseApplicationController::index).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewRoster', Enrolment::class);

        $validated = $request->validate([
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'section_id' => ['nullable', 'integer', 'exists:course_sections,id'],
            'status' => ['nullable', Rule::enum(EnrolmentStatus::class)],
            'source' => ['nullable', Rule::enum(EnrolmentSource::class)],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $enrolments = Enrolment::query()
            ->with(['student', 'course', 'section'])
            ->when(
                $request->user()->role === UserRole::Instructor,
                fn ($query) => $query->whereHas('course.instructors', fn ($q) => $q->where('users.id', $request->user()->id)),
            )
            ->when($validated['course_id'] ?? null, fn ($query, $courseId) => $query->where('course_id', $courseId))
            ->when($validated['section_id'] ?? null, fn ($query, $sectionId) => $query->where('section_id', $sectionId))
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($validated['source'] ?? null, fn ($query, $source) => $query->where('source', $source))
            ->when(
                $validated['search'] ?? null,
                fn ($query, $search) => $query->whereHas('student', function ($q) use ($search): void {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                }),
            )
            ->latest('applied_at')
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        $this->attachProgressPercent($enrolments->items());

        return AdminEnrolmentResource::collection($enrolments);
    }

    /**
     * Manually move an enrolment between confirmed, waitlisted and withdrawn. The service
     * keeps seat counts, orders, emails and the audit trail consistent.
     */
    public function updateStatus(Request $request, Enrolment $enrolment): AdminEnrolmentResource
    {
        $this->authorize('updateStatus', $enrolment);

        $validated = $request->validate([
            'status' => ['required', Rule::enum(EnrolmentStatus::class)],
        ]);

        $enrolment = $this->enrolmentService->changeStatus(
            $enrolment,
            EnrolmentStatus::from($validated['status']),
            $request->user(),
        );

        $enrolment->load(['student', 'course', 'section']);
        $this->attachProgressPercent([$enrolment]);

        return new AdminEnrolmentResource($enrolment);
    }

    /**
     * Same progress definition as the student dashboard: completed module-progress rows over
     * the student's applicable modules for the course. Attached as a dynamic attribute the
     * resource reads, so the expensive bit stays out of the resource layer.
     *
     * @param  array<int, Enrolment>  $enrolments
     */
    private function attachProgressPercent(array $enrolments): void
    {
        foreach ($enrolments as $enrolment) {
            $applicableModuleIds = $this->progressEngine
                ->applicableModules($enrolment->student, $enrolment->course)
                ->pluck('id');

            $totalCount = $applicableModuleIds->count();

            $completedCount = $totalCount > 0
                ? ModuleProgress::query()
                    ->where('student_id', $enrolment->student_id)
                    ->whereIn('module_id', $applicableModuleIds)
                    ->where('status', ModuleProgressStatus::Completed)
                    ->count()
                : 0;

            $enrolment->setAttribute(
                'progress_percent',
                $totalCount > 0 ? round($completedCount / $totalCount * 100, 2) : 0.0,
            );
        }
    }
}
