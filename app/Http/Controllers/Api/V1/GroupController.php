<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\AddGroupMemberRequest;
use App\Http\Requests\Api\V1\StoreGroupRequest;
use App\Http\Requests\Api\V1\UpdateGroupRequest;
use App\Http\Resources\GroupResource;
use App\Models\Course;
use App\Models\GroupsCohort;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class GroupController extends Controller
{
    public function index(Course $course): AnonymousResourceCollection
    {
        return GroupResource::collection($course->groups()->with('members')->get());
    }

    public function store(StoreGroupRequest $request, Course $course): GroupResource
    {
        $group = $course->groups()->create($request->validated());

        return new GroupResource($group->load('members'));
    }

    public function update(UpdateGroupRequest $request, GroupsCohort $group): GroupResource
    {
        $group->update($request->validated());

        return new GroupResource($group->load('members'));
    }

    public function destroy(GroupsCohort $group): Response
    {
        $this->authorize('delete', $group);

        $group->delete();

        return response()->noContent();
    }

    public function addMember(AddGroupMemberRequest $request, GroupsCohort $group): GroupResource
    {
        $group->members()->syncWithoutDetaching([$request->validated('student_id') => ['added_at' => now()]]);

        return new GroupResource($group->load('members'));
    }

    public function removeMember(GroupsCohort $group, int $student): Response
    {
        $this->authorize('update', $group);

        $group->members()->detach($student);

        return response()->noContent();
    }
}
