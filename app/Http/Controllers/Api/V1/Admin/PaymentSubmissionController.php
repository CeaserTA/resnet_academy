<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\RejectPaymentSubmissionRequest;
use App\Http\Resources\PaymentSubmissionResource;
use App\Models\PaymentSubmission;
use App\Models\User;
use App\Services\Payments\PaymentSubmissionService;
use Illuminate\Http\Request;

/**
 * Admin-only review of a student's submitted payment — same gate as
 * `Admin\OrderController::update()`'s manual entry path.
 */
final class PaymentSubmissionController extends Controller
{
    public function __construct(private readonly PaymentSubmissionService $paymentSubmissionService) {}

    public function confirm(Request $request, PaymentSubmission $paymentSubmission): PaymentSubmissionResource
    {
        $this->authorize('update', User::class);

        $submission = $this->paymentSubmissionService->confirm($paymentSubmission, $request->user());

        return new PaymentSubmissionResource($submission);
    }

    public function reject(RejectPaymentSubmissionRequest $request, PaymentSubmission $paymentSubmission): PaymentSubmissionResource
    {
        $submission = $this->paymentSubmissionService->reject(
            $paymentSubmission,
            $request->user(),
            $request->validated('reason'),
        );

        return new PaymentSubmissionResource($submission);
    }
}
