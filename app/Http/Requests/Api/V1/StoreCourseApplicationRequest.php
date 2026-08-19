<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\UserRole;
use App\Models\Course;
use App\Services\Profile\ProfileService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

final class StoreCourseApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->role === UserRole::Student;
    }

    /**
     * Defence-in-depth behind the profile.complete route middleware: an unvalidated API client
     * bypassing the middleware still gets the same 403 profile_incomplete envelope, so the
     * frontend profile gate can never be the only guard.
     */
    public function withValidator(Validator $validator): void
    {
        $user = $this->user();
        $profileService = app(ProfileService::class);

        if (! $profileService->isProfileComplete($user)) {
            throw new HttpResponseException(response()->json([
                'error' => [
                    'code' => 'profile_incomplete',
                    'message' => 'Please complete your profile before applying for this course.',
                    'missing_fields' => $profileService->getMissingFields($user),
                ],
            ], 403));
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $course = Course::query()->find($this->integer('course_id'));
        $expectedAnswerCount = $course !== null ? count($course->application_questions ?? []) : 0;
        $portfolioRequired = $course !== null && $course->application_require_portfolio_url;

        return [
            'course_id' => ['required', 'integer', Rule::exists('courses', 'id')->where('status', 'published')],
            'section_id' => [
                'nullable',
                'integer',
                Rule::exists('course_sections', 'id')->where('course_id', $this->integer('course_id')),
            ],
            // "present" rather than "required": a course with no questions legitimately
            // receives an empty array, which "required" would reject.
            'answers' => ['present', 'array', "size:{$expectedAnswerCount}"],
            'answers.*' => ['required', 'string', 'max:2000'],
            'portfolio_url' => [
                Rule::requiredIf($portfolioRequired),
                'nullable',
                'url',
                'max:500',
            ],
            'alternative_proof_text' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
