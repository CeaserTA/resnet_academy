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
use App\Services\Content\LiveSessionAudience;
use App\Services\Content\RecordingLinkChecker;
use App\Services\Content\ResourceManager;
use App\Services\Storage\MediaStorageService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class ResourceController extends Controller
{
    public function __construct(
        private readonly ResourceManager $resourceManager,
        private readonly MediaStorageService $mediaStorage,
        private readonly RecordingLinkChecker $recordingLinkChecker,
        private readonly LiveSessionAudience $liveSessionAudience,
    ) {}

    public function show(Request $request, Resource $resource): ResourceItemResource
    {
        $user = $request->user();

        // A live session run for another cohort is not this student's to open, meeting link
        // included. 404 rather than 403 so it does not confirm the session exists.
        if ($user && $user->role->value === 'student' && $resource->type === ResourceType::LiveSession) {
            abort_if(
                $this->liveSessionAudience->hiddenResourceIds($user, $resource->module->course_id, [$resource->id]) !== [],
                404,
            );
        }

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

        $recordingToCheck = $this->recordingUrlToCheck($data, null);
        $resource = $this->resourceManager->create($module, $data);

        return $this->withRecordingWarning(new ResourceItemResource($resource), $recordingToCheck);
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

        $recordingToCheck = $this->recordingUrlToCheck($data, $resource->liveSession?->recording_url);
        $resource = $this->resourceManager->update($resource, $data);

        return $this->withRecordingWarning(new ResourceItemResource($resource), $recordingToCheck);
    }

    /**
     * The recording link worth spending an outbound HTTP check on: one that is actually being
     * set, and (on update) one that has changed — otherwise every unrelated edit to a live
     * session would re-fetch the same URL.
     *
     * @param  array<string, mixed>  $data
     */
    private function recordingUrlToCheck(array $data, ?string $current): ?string
    {
        $incoming = $data['recording_url'] ?? null;

        if (! is_string($incoming) || trim($incoming) === '' || $incoming === $current) {
            return null;
        }

        return $incoming;
    }

    /**
     * Surfaces a suspect recording link as a warning alongside the saved resource rather than
     * rejecting the save. The admin is told immediately, at the moment they paste it, instead of
     * a student finding out later that the link opens a sign-in wall — but a false positive
     * (provider markup changes, a transient network failure) can never block legitimate work.
     */
    private function withRecordingWarning(ResourceItemResource $payload, ?string $url): ResourceItemResource
    {
        if ($url === null) {
            return $payload;
        }

        $result = $this->recordingLinkChecker->check($url);

        if ($result['ok']) {
            return $payload;
        }

        return $payload->additional(['recording_link_warning' => $result['reason']]);
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
