<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

final class ForumPostResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'thread_id' => $this->thread_id,
            'user' => new UserResource($this->whenLoaded('user')),
            'body' => $this->body,
            'attachment_type' => $this->attachment_type?->value,
            'attachment_url' => $this->attachment_path ? Storage::disk('public')->url($this->attachment_path) : null,
            'attachment_original_name' => $this->attachment_original_name,
            // No separate `edited_at` column — `updated_at` already carries this signal, and
            // Eloquent's `ON UPDATE CURRENT_TIMESTAMP` means the two only diverge on a real edit.
            // Known narrow edge case: both columns are second-precision (no fractional seconds),
            // so an edit within the same wall-clock second as creation won't register as edited —
            // judged an acceptable tradeoff for a cosmetic indicator rather than adding a column.
            'edited' => ! $this->created_at->equalTo($this->updated_at),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
