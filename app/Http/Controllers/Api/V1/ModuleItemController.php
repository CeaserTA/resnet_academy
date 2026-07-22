<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdateModuleItemRequest;
use App\Http\Resources\ModuleItemResource;
use App\Models\ModuleItem;

final class ModuleItemController extends Controller
{
    /**
     * Reorder within the module or flag optional (is_required = false doesn't block module
     * completion — PRD "Module completion definition").
     */
    public function update(UpdateModuleItemRequest $request, ModuleItem $moduleItem): ModuleItemResource
    {
        $moduleItem->update($request->validated());

        return new ModuleItemResource($moduleItem);
    }
}
