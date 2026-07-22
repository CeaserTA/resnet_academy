<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\ForumPostReportStatus;
use App\Models\ForumPostReport;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

final class UpdateForumPostReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var ForumPostReport $report */
        $report = $this->route('report');

        return $this->user()->can('moderate', [ForumPostReport::class, $report->post->thread->forum->course]);
    }

    public function rules(): array
    {
        return [
            'status' => ['required', new Enum(ForumPostReportStatus::class)],
        ];
    }
}
