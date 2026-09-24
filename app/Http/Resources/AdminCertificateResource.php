<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin support view of a certificate.
 *
 * `status` is derived, not stored: 'ready' once the PDF has been rendered, 'generating' until
 * then. The system persists no 'failed' state — a render that exhausts its queue retries only
 * writes to the log — so a certificate that failed looks exactly like one still waiting, which is
 * why the admin screen offers regeneration for anything not yet ready.
 */
final class AdminCertificateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Certificates carry no cohort of their own; the controller attaches the one from the
        // student's enrolment in the course as a relation so it never ends up in a save().
        $cohort = $this->resource->relationLoaded('cohort') ? $this->resource->getRelation('cohort') : null;

        return [
            'id' => $this->id,
            'certificate_number' => $this->certificate_number,
            'status' => $this->certificate_url === null ? 'generating' : 'ready',
            'issued_at' => $this->issued_at->toIso8601String(),
            'student' => [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'email' => $this->student->email,
            ],
            'course' => [
                'id' => $this->course->id,
                'title' => $this->course->title,
            ],
            'cohort' => $cohort ? ['id' => $cohort->id, 'name' => $cohort->name] : null,
        ];
    }
}
