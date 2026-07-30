<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreModuleRequest;
use App\Http\Requests\Api\V1\UpdateModuleRequest;
use App\Http\Resources\ModuleResource;
use App\Models\Course;
use App\Models\Module;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class ModuleController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * FR-6/FR-9: modules in sequential order. Locked modules are still shown (dimmed in the
     * UI), never hidden — ui-context.md §6.
     */
    public function index(Course $course): AnonymousResourceCollection
    {
        return ModuleResource::collection($course->modules()->with(['groups', 'resources', 'assignments', 'evaluations'])->get());
    }

    /**
     * Soft-deleted modules for this course, most recently deleted first — the "Recently deleted"
     * restore view. Same relations as `index()` so `ModuleResource`'s existing `items` payload is
     * populated for free, letting the UI show exactly what's still attached before restoring.
     */
    public function trashed(Course $course): AnonymousResourceCollection
    {
        $this->authorize('create', [Module::class, $course]);

        return ModuleResource::collection(
            $course->modules()
                ->onlyTrashed()
                ->with(['groups', 'resources', 'assignments', 'evaluations'])
                ->orderByDesc('deleted_at')
                ->get()
        );
    }

    public function store(StoreModuleRequest $request, Course $course): ModuleResource
    {
        $data = $request->validated();
        $groupIds = $data['group_ids'] ?? [];
        unset($data['group_ids']);

        if (! isset($data['order_index'])) {
            $data['order_index'] = ((int) $course->modules()->max('order_index')) + 1;
        }

        $module = $course->modules()->create($data);

        if ($groupIds !== []) {
            $module->groups()->sync($groupIds);
        }

        return new ModuleResource($module->load(['groups', 'resources']));
    }

    public function update(UpdateModuleRequest $request, Module $module): ModuleResource
    {
        $data = $request->validated();
        $groupIds = $data['group_ids'] ?? null;
        unset($data['group_ids']);

        $module->update($data);

        if ($groupIds !== null) {
            $module->groups()->sync($groupIds);
        }

        return new ModuleResource($module->load(['groups', 'resources']));
    }

    public function destroy(Request $request, Module $module): Response
    {
        $this->authorize('delete', $module);

        $this->auditLogger->log(
            action: 'module.deleted',
            entityType: 'module',
            entityId: $module->id,
            actorId: $request->user()->id,
            meta: ['title' => $module->title],
        );

        $module->delete();

        return response()->noContent();
    }

    /**
     * Restores a soft-deleted module — its resources/module_items were never actually touched
     * (soft-deleting the module doesn't cascade), so restoring is the entire operation.
     */
    public function restore(Request $request, Module $module): ModuleResource
    {
        $this->authorize('restore', $module);

        $module->restore();

        $this->auditLogger->log(
            action: 'module.restored',
            entityType: 'module',
            entityId: $module->id,
            actorId: $request->user()->id,
            meta: ['title' => $module->title],
        );

        return new ModuleResource($module->load(['groups', 'resources']));
    }
}
