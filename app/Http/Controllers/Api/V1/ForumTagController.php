<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ForumTagResource;
use App\Models\ForumTag;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Tags are global (not course-scoped, see `ForumService::syncTags()`) and reveal nothing
 * course-specific, so this is open to any authenticated user — used by the composer's tag
 * autocomplete.
 */
final class ForumTagController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return ForumTagResource::collection(ForumTag::query()->orderBy('name')->get());
    }
}
