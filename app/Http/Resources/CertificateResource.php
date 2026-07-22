<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class CertificateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'certificate_number' => $this->certificate_number,
            'certificate_url' => $this->certificate_url,
            'issued_at' => $this->issued_at->toIso8601String(),
            'course' => [
                'id' => $this->course->id,
                'title' => $this->course->title,
            ],
            'student' => new UserResource($this->whenLoaded('student')),
        ];
    }
}
