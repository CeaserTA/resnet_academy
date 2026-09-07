<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use Database\Factories\EnrolmentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

final class Enrolment extends Model
{
    /** @use HasFactory<EnrolmentFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'student_id',
        'course_id',
        'cohort_course_id',
        'status',
        'source',
        'imported_by',
        'applied_at',
        'confirmation_email_due_at',
        'confirmation_email_sent_at',
        'transferred_to_id',
        'transfer_requested_at',
        'withdrawal_note',
    ];

    protected $casts = [
        'status' => EnrolmentStatus::class,
        'source' => EnrolmentSource::class,
        'applied_at' => 'datetime',
        'confirmation_email_due_at' => 'datetime',
        'confirmation_email_sent_at' => 'datetime',
        'transfer_requested_at' => 'datetime',
    ];

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

    /**
     * @return BelongsTo<CohortCourse, $this>
     */
    public function cohortCourse(): BelongsTo
    {
        return $this->belongsTo(CohortCourse::class, 'cohort_course_id');
    }

    public function importedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'imported_by');
    }

    public function order(): HasOne
    {
        return $this->hasOne(Order::class);
    }

    /**
     * @return BelongsTo<Enrolment, $this>
     */
    public function transferredTo(): BelongsTo
    {
        return $this->belongsTo(Enrolment::class, 'transferred_to_id');
    }

    /**
     * @return HasOne<Enrolment, $this>
     */
    public function transferredFrom(): HasOne
    {
        return $this->hasOne(Enrolment::class, 'transferred_to_id');
    }
}
