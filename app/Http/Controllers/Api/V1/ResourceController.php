<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreResourceRequest;
use App\Http\Requests\Api\V1\UpdateResourceRequest;
use App\Http\Resources\ResourceItemResource;
use App\Models\Module;
use App\Models\Resource;
use App\Services\Content\ResourceManager;
use Illuminate\Http\Response;

final class ResourceController extends Controller
{
    public function __construct(private readonly ResourceManager $resourceManager) {}

    public function show(Resource $resource): ResourceItemResource
    {
        return new ResourceItemResource($resource->load(['video', 'document', 'reading', 'externalLink', 'scormPackage', 'liveSession', 'downloadableFile']));
    }

    public function store(StoreResourceRequest $request, Module $module): ResourceItemResource
    {
        $resource = $this->resourceManager->create($module, $request->validated());

        return new ResourceItemResource($resource);
    }

    public function update(UpdateResourceRequest $request, Resource $resource): ResourceItemResource
    {
        $resource = $this->resourceManager->update($resource, $request->validated());

        return new ResourceItemResource($resource);
    }

    public function destroy(Resource $resource): Response
    {
        $this->authorize('delete', $resource);

        $this->resourceManager->delete($resource);

        return response()->noContent();
    }
}
