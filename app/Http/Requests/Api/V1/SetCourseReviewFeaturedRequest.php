<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\CourseReview;
use Illuminate\Foundation\Http\FormRequest;

final class SetCourseReviewFeaturedRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('feature', CourseReview::class);
    }

    public function rules(): array
    {
        return [
            'is_featured' => ['required', 'boolean'],
        ];
    }
}
