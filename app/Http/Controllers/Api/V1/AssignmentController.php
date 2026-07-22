<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreAssignmentRequest;
use App\Http\Requests\Api\V1\UpdateAssignmentRequest;
use App\Http\Resources\AssignmentResource;
use App\Models\Assignment;
use App\Services\Assessment\AssignmentManager;
use Illuminate\Http\Response;

final class AssignmentController extends Controller
{
    public function __construct(private readonly AssignmentManager $assignmentManager) {}

    public function show(Assignment $assignment): AssignmentResource
    {
        return new AssignmentResource($assignment->load('rubrics'));
    }

    public function store(StoreAssignmentRequest $request): AssignmentResource
    {
        $assignment = $this->assignmentManager->create($request->route('module'), $request->validated());

        return new AssignmentResource($assignment->load('rubrics'));
    }

    public function update(UpdateAssignmentRequest $request, Assignment $assignment): AssignmentResource
    {
        $assignment = $this->assignmentManager->update($assignment, $request->validated());

        return new AssignmentResource($assignment->load('rubrics'));
    }

    public function destroy(Assignment $assignment): Response
    {
        $this->authorize('delete', $assignment);

        $this->assignmentManager->delete($assignment);

        return response()->noContent();
    }
}
