<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\CourseReview;
use Illuminate\Foundation\Http\FormRequest;

final class RejectCourseReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('reject', CourseReview::class);
    }

    public function rules(): array
    {
        return [
            'admin_notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
