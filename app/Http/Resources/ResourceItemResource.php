<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\ResourceType;
use App\Models\ModuleItem;
use App\Models\Resource;
use App\Services\Progress\ProgressEngine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One shape for all 7 resource types — the type-specific subtype table fields are flattened
 * in under `details`, keeping each type normalized at the DB layer (schema.sql §6) while the
 * API still returns one consistent envelope per resource.
 *
 * @property \App\Models\Resource $resource
 */
final class ResourceItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $moduleItem = ModuleItem::query()
            ->where('item_type', 'resource')
            ->where('item_id', $this->id)
            ->first();

        $user = $request->user();
        $isComplete = null;

        if ($user && $user->role->value === 'student') {
            $isComplete = app(ProgressEngine::class)->isResourceComplete($user, $this->resource);
        }

        return [
            'id' => $this->id,
            'module_id' => $this->module_id,
            'type' => $this->type->value,
            'title' => $this->title,
            'description' => $this->description,
            // @phpstan-ignore nullsafe.neverNull (false positive: ->first() returns ModuleItem|null on no match)
            'is_required' => $moduleItem?->is_required ?? true,
            // @phpstan-ignore nullsafe.neverNull (false positive: ->first() returns ModuleItem|null on no match)
            'order_index' => $moduleItem?->order_index ?? 0,
            'is_complete' => $isComplete,
            'details' => $this->typeDetails(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function typeDetails(): array
    {
        return match ($this->resource->type) {
            ResourceType::Video => [
                'bunny_stream_video_id' => $this->video?->bunny_stream_video_id,
                'duration_seconds' => $this->video?->duration_seconds,
                'caption_url' => $this->video?->caption_url,
            ],
            ResourceType::Document => [
                'file_url' => $this->document?->file_url,
                'file_type' => $this->document?->file_type,
                'file_size_kb' => $this->document?->file_size_kb,
            ],
            ResourceType::Reading => [
                'content_html' => $this->reading?->content_html,
            ],
            ResourceType::ExternalLink => [
                'url' => $this->externalLink?->url,
            ],
            ResourceType::Scorm => [
                'package_url' => $this->scormPackage?->package_url,
                'standard' => $this->scormPackage?->standard?->value,
            ],
            ResourceType::LiveSession => [
                'provider' => $this->liveSession?->provider?->value,
                'meeting_url' => $this->liveSession?->meeting_url,
                'scheduled_at' => $this->liveSession?->scheduled_at?->toIso8601String(),
                'duration_minutes' => $this->liveSession?->duration_minutes,
            ],
            ResourceType::DownloadableFile => [
                'file_url' => $this->downloadableFile?->file_url,
                'file_size_kb' => $this->downloadableFile?->file_size_kb,
            ],
        };
    }
}
