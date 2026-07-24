<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Services\Storage\MediaStorageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class PaymentSubmissionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'amount' => $this->amount,
            'receipt_url' => app(MediaStorageService::class)->url($this->receipt_path),
            'receipt_original_name' => $this->receipt_original_name,
            'status' => $this->status->value,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
