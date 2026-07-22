<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StorePaymentSubmissionRequest;
use App\Http\Resources\PaymentSubmissionResource;
use App\Models\Order;
use App\Services\Payments\PaymentSubmissionService;
use Illuminate\Http\JsonResponse;

final class PaymentSubmissionController extends Controller
{
    public function __construct(private readonly PaymentSubmissionService $paymentSubmissionService) {}

    /**
     * A student submitting a claimed payment + receipt against their own order (`OrderPolicy::submitPayment`).
     * Sits `pending` until an admin confirms or rejects it (`Admin\PaymentSubmissionController`).
     */
    public function store(StorePaymentSubmissionRequest $request, Order $order): JsonResponse
    {
        $submission = $this->paymentSubmissionService->submit(
            $order,
            (float) $request->validated('amount'),
            $request->file('receipt'),
        );

        return (new PaymentSubmissionResource($submission))->response()->setStatusCode(201);
    }
}
