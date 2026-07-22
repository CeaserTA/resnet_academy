<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreModuleRequest;
use App\Http\Requests\Api\V1\UpdateModuleRequest;
use App\Http\Resources\ModuleResource;
use App\Models\Course;
use App\Models\Module;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class ModuleController extends Controller
{
    /**
     * FR-6/FR-9: modules in sequential order. Locked modules are still shown (dimmed in the
     * UI), never hidden — ui-context.md §6.
     */
    public function index(Course $course): AnonymousResourceCollection
    {
        return ModuleResource::collection($course->modules()->with(['groups', 'resources', 'assignments', 'evaluations'])->get());
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

    public function destroy(Module $module): Response
    {
        $this->authorize('delete', $module);

        $module->delete();

        return response()->noContent();
    }
}
