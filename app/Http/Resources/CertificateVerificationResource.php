<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The public verification shape — deliberately minimal (architecture.md §5.4 "certificate
 * verification view"). No student email, no internal IDs; just enough to confirm a printed
 * certificate is genuine.
 */
final class CertificateVerificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'valid' => true,
            'certificate_number' => $this->certificate_number,
            'student_name' => $this->student->name,
            'course_title' => $this->course->title,
            'issued_at' => $this->issued_at->toIso8601String(),
        ];
    }
}
