<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\ResourceType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreResourceRequest;
use App\Http\Requests\Api\V1\UpdateResourceRequest;
use App\Http\Resources\ResourceItemResource;
use App\Models\Module;
use App\Models\Resource;
use App\Services\Content\ResourceManager;
use App\Services\Storage\MediaStorageService;
use Illuminate\Http\Response;

final class ResourceController extends Controller
{
    public function __construct(
        private readonly ResourceManager $resourceManager,
        private readonly MediaStorageService $mediaStorage,
    ) {}

    public function show(Resource $resource): ResourceItemResource
    {
        return new ResourceItemResource($resource->load(['video', 'document', 'reading', 'externalLink', 'scormPackage', 'liveSession', 'downloadableFile']));
    }

    public function store(StoreResourceRequest $request, Module $module): ResourceItemResource
    {
        $data = $request->validated();
        unset($data['file'], $data['package']);

        if ($request->hasFile('file')) {
            $data['file_url'] = $this->mediaStorage->store($request->file('file'), "resources/{$module->course_id}");
        }

        if ($request->hasFile('package')) {
            $data['package_url'] = $this->mediaStorage->store($request->file('package'), "resources/{$module->course_id}");
        }

        $resource = $this->resourceManager->create($module, $data);

        return new ResourceItemResource($resource);
    }

    public function update(UpdateResourceRequest $request, Resource $resource): ResourceItemResource
    {
        $data = $request->validated();
        unset($data['file'], $data['package']);

        if ($request->hasFile('file')) {
            $this->mediaStorage->delete($this->currentFileUrl($resource));
            $data['file_url'] = $this->mediaStorage->store($request->file('file'), "resources/{$resource->module->course_id}");
        }

        if ($request->hasFile('package')) {
            $this->mediaStorage->delete($resource->scormPackage?->package_url);
            $data['package_url'] = $this->mediaStorage->store($request->file('package'), "resources/{$resource->module->course_id}");
        }

        $resource = $this->resourceManager->update($resource, $data);

        return new ResourceItemResource($resource);
    }

    private function currentFileUrl(Resource $resource): ?string
    {
        return match ($resource->type) {
            ResourceType::Document => $resource->document?->file_url,
            ResourceType::DownloadableFile => $resource->downloadableFile?->file_url,
            default => null,
        };
    }

    public function destroy(Resource $resource): Response
    {
        $this->authorize('delete', $resource);

        $this->resourceManager->delete($resource);

        return response()->noContent();
    }
}
