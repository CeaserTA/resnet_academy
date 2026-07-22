<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\Announcement;
use App\Models\Course;
use Illuminate\Foundation\Http\FormRequest;

final class StoreAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Course $course */
        $course = $this->route('course');

        return $this->user()->can('create', [Announcement::class, $course]);
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string'],
        ];
    }
}
