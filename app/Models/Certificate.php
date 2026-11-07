<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\CertificateFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class Certificate extends Model
{
    /** @use HasFactory<CertificateFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'student_id',
        'course_id',
        'certificate_number',
        'certificate_url',
        'issued_at',
        'revoked_at',
        'revoked_by',
        'revoke_reason',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    /** Withheld by an admin (BACKEND_CHANGES.md §5). */
    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }
}
