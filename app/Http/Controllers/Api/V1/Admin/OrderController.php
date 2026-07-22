<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Payments management: every order across every student, unlike `EnrolmentController::index()`
 * which is scoped to the authenticated student's own rows. Same admin-only gate as the other
 * `/admin/*` read endpoints.
 */
final class OrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        $orders = Order::query()
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->with(['student', 'course'])
            ->latest('id')
            ->paginate(50);

        return OrderResource::collection($orders);
    }
}
