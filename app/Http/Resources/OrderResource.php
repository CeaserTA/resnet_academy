<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\PaymentSubmissionStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'student' => new UserResource($this->whenLoaded('student')),
            'course' => $this->whenLoaded('course', fn () => $this->course ? ['id' => $this->course->id, 'title' => $this->course->title] : null),
            'amount' => $this->amount,
            'amount_paid' => $this->amount_paid,
            'remaining_balance' => round((float) $this->amount - (float) $this->amount_paid, 2),
            'currency' => $this->currency,
            'status' => $this->status->value,
            'payment_method' => $this->payment_method,
            'provider_ref' => $this->provider_ref,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
            'pending_submission' => $this->whenLoaded(
                'paymentSubmissions',
                fn () => optional($this->paymentSubmissions->firstWhere('status', PaymentSubmissionStatus::Pending), fn ($submission) => new PaymentSubmissionResource($submission)),
            ),
            'payment_submissions' => PaymentSubmissionResource::collection($this->whenLoaded('paymentSubmissions')),
        ];
    }
}
