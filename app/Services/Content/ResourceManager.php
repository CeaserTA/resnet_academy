<?php

declare(strict_types=1);

namespace App\Services\Content;

use App\Enums\ModuleItemType;
use App\Enums\ResourceType;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\Resource;
use App\Models\ResourceDocument;
use App\Models\ResourceDownloadableFile;
use App\Models\ResourceExternalLink;
use App\Models\ResourceLiveSession;
use App\Models\ResourceReading;
use App\Models\ResourceScormPackage;
use App\Models\ResourceVideo;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/**
 * Dispatches resource create/update across the 7 type-specific detail tables (schema.sql §6)
 * behind one API shape, and keeps the matching module_items row (order_index/is_required) in
 * sync in the same transaction — a resource and its module-item slot are always created and
 * removed together.
 */
final class ResourceManager
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(Module $module, array $data): Resource
    {
        return DB::transaction(function () use ($module, $data): Resource {
            $type = ResourceType::from($data['type']);

            $resource = Resource::create([
                'module_id' => $module->id,
                'type' => $type,
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
            ]);

            $this->createSubtype($resource, $type, $data);

            ModuleItem::create([
                'module_id' => $module->id,
                'item_type' => ModuleItemType::Resource,
                'item_id' => $resource->id,
                'order_index' => $data['order_index'] ?? ((int) $module->items()->max('order_index')) + 1,
                'is_required' => $data['is_required'] ?? true,
            ]);

            // Not ->fresh(): resources has no DB-side defaults beyond timestamps, and a
            // re-fetched model loses wasRecentlyCreated, which Laravel uses to auto-return 201.
            return $resource;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Resource $resource, array $data): Resource
    {
        return DB::transaction(function () use ($resource, $data): Resource {
            $resource->fill(Arr::only($data, ['title', 'description']))->save();

            $this->updateSubtype($resource, $data);

            $moduleItem = ModuleItem::query()
                ->where('item_type', ModuleItemType::Resource)
                ->where('item_id', $resource->id)
                ->first();

            $moduleItemFields = Arr::only($data, ['is_required', 'order_index']);

            if ($moduleItem && $moduleItemFields !== []) {
                $moduleItem->update($moduleItemFields);
            }

            return $resource->fresh();
        });
    }

    public function delete(Resource $resource): void
    {
        DB::transaction(function () use ($resource): void {
            ModuleItem::query()
                ->where('item_type', ModuleItemType::Resource)
                ->where('item_id', $resource->id)
                ->delete();

            $resource->delete();
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function createSubtype(Resource $resource, ResourceType $type, array $data): void
    {
        match ($type) {
            ResourceType::Video => ResourceVideo::create([
                'resource_id' => $resource->id,
                'bunny_stream_video_id' => $data['bunny_stream_video_id'],
                'duration_seconds' => $data['duration_seconds'] ?? null,
                'caption_url' => $data['caption_url'] ?? null,
            ]),
            ResourceType::Document => ResourceDocument::create([
                'resource_id' => $resource->id,
                'file_url' => $data['file_url'],
                'file_type' => $data['file_type'],
                'file_size_kb' => $data['file_size_kb'] ?? null,
            ]),
            ResourceType::Reading => ResourceReading::create([
                'resource_id' => $resource->id,
                'content_html' => $data['content_html'],
            ]),
            ResourceType::ExternalLink => ResourceExternalLink::create([
                'resource_id' => $resource->id,
                'url' => $data['url'],
            ]),
            ResourceType::Scorm => ResourceScormPackage::create([
                'resource_id' => $resource->id,
                'package_url' => $data['package_url'],
                'standard' => $data['standard'],
            ]),
            ResourceType::LiveSession => ResourceLiveSession::create([
                'resource_id' => $resource->id,
                'provider' => $data['provider'],
                'meeting_url' => $data['meeting_url'],
                'scheduled_at' => $data['scheduled_at'],
                'duration_minutes' => $data['duration_minutes'],
            ]),
            ResourceType::DownloadableFile => ResourceDownloadableFile::create([
                'resource_id' => $resource->id,
                'file_url' => $data['file_url'],
                'file_size_kb' => $data['file_size_kb'] ?? null,
            ]),
        };
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function updateSubtype(Resource $resource, array $data): void
    {
        $subtype = match ($resource->type) {
            ResourceType::Video => $resource->video,
            ResourceType::Document => $resource->document,
            ResourceType::Reading => $resource->reading,
            ResourceType::ExternalLink => $resource->externalLink,
            ResourceType::Scorm => $resource->scormPackage,
            ResourceType::LiveSession => $resource->liveSession,
            ResourceType::DownloadableFile => $resource->downloadableFile,
        };

        if (! $subtype) {
            return;
        }

        $fields = match ($resource->type) {
            ResourceType::Video => ['bunny_stream_video_id', 'duration_seconds', 'caption_url'],
            ResourceType::Document => ['file_url', 'file_type', 'file_size_kb'],
            ResourceType::Reading => ['content_html'],
            ResourceType::ExternalLink => ['url'],
            ResourceType::Scorm => ['package_url', 'standard'],
            ResourceType::LiveSession => ['provider', 'meeting_url', 'scheduled_at', 'duration_minutes'],
            ResourceType::DownloadableFile => ['file_url', 'file_size_kb'],
        };

        $updates = Arr::only($data, $fields);

        if ($updates !== []) {
            $subtype->update($updates);
        }
    }
}
