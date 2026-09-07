<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\CourseEnrolmentPolicy;
use App\Enums\CourseLevel;
use App\Enums\CourseStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreCourseRequest;
use App\Http\Requests\Api\V1\UpdateCourseRequest;
use App\Http\Resources\CourseResource;
use App\Models\Course;
use App\Models\CourseChangeLog;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Storage\MediaStorageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

final class CourseController extends Controller
{
    public function __construct(
        private readonly NotificationDispatcher $notificationDispatcher,
        private readonly MediaStorageService $mediaStorage,
    ) {}

    /**
     * FR-1: catalogue browse with filters (category, level, schedule, instructor).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Course::query()->with(['category', 'instructors']);

        if (! $request->user() || $request->user()->role === UserRole::Student) {
            $query->where('status', CourseStatus::Published);
        } elseif ($request->user()->role === UserRole::Instructor) {
            $query->where(function ($q) use ($request): void {
                $q->where('status', CourseStatus::Published)
                    ->orWhereHas('instructors', fn ($i) => $i->where('users.id', $request->user()->id));
            });
        } elseif ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('level')) {
            $query->where('level', $request->string('level'));
        }

        if ($request->filled('instructor_id')) {
            $query->whereHas('instructors', fn ($i) => $i->where('users.id', $request->integer('instructor_id')));
        }

        if ($request->filled('schedule_from')) {
            $query->whereDate('schedule_start_date', '>=', $request->date('schedule_from'));
        }

        if ($request->filled('schedule_to')) {
            $query->whereDate('schedule_start_date', '<=', $request->date('schedule_to'));
        }

        $courses = $query->orderBy('created_at', 'desc')->paginate(15);

        return CourseResource::collection($courses);
    }

    public function show(Course $course): CourseResource
    {
        return new CourseResource($course->load(['category', 'instructors']));
    }

    public function store(StoreCourseRequest $request): CourseResource
    {
        $data = $request->validated();
        $instructorIds = $data['instructor_ids'] ?? [];
        unset($data['instructor_ids'], $data['thumbnail']);

        $data['enrolment_policy'] ??= CourseEnrolmentPolicy::defaultForLevel(CourseLevel::from($data['level']))->value;

        if ($request->hasFile('thumbnail')) {
            $data['thumbnail_url'] = $this->mediaStorage->store($request->file('thumbnail'), 'courses');
        }

        $course = DB::transaction(function () use ($data, $instructorIds, $request): Course {
            $course = Course::create([...$data, 'created_by' => $request->user()->id]);
            $course->refresh();

            if ($instructorIds !== []) {
                $course->instructors()->sync($instructorIds);
            }

            return $course;
        });

        return new CourseResource($course->load(['category', 'instructors']));
    }

    /**
     * Course edits apply immediately to already-enrolled students; versioning is a
     * changelog, not a snapshot (ai-workflow-rules.md §5).
     */
    public function update(UpdateCourseRequest $request, Course $course): CourseResource
    {
        $data = $request->validated();
        $instructorIds = $data['instructor_ids'] ?? null;
        $changeSummary = $data['change_summary'] ?? null;
        unset($data['instructor_ids'], $data['change_summary'], $data['thumbnail']);

        if ($request->hasFile('thumbnail')) {
            $this->mediaStorage->delete($course->thumbnail_url);
            $data['thumbnail_url'] = $this->mediaStorage->store($request->file('thumbnail'), 'courses');
        }

        DB::transaction(function () use ($course, $data, $instructorIds, $changeSummary, $request): void {
            // Lock the course row before touching current_version: increment() issues an atomic
            // `SET current_version = current_version + 1` at the DB layer, but Eloquent then sets
            // the *local* attribute from the old in-memory value rather than re-reading the row, so
            // two concurrent edits could previously log duplicate version_number values in
            // course_change_log even though the underlying counter itself incremented correctly.
            $course = $course->newQuery()->whereKey($course->id)->lockForUpdate()->firstOrFail();

            $course->update($data);

            if ($instructorIds !== null) {
                $course->instructors()->sync($instructorIds);
            }

            if ($changeSummary !== null) {
                $course->increment('current_version');
                $course->refresh();

                CourseChangeLog::create([
                    'course_id' => $course->id,
                    'version_number' => $course->current_version,
                    'changed_by' => $request->user()->id,
                    'change_summary' => $changeSummary,
                ]);

                $this->notificationDispatcher->notifyCourseChanged($course, $changeSummary);
            }
        });

        return new CourseResource($course->fresh(['category', 'instructors']));
    }

    public function destroy(Course $course): Response
    {
        $this->authorize('delete', $course);

        $course->delete();

        return response()->noContent();
    }
}
