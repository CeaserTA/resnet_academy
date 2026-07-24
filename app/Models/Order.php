<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OrderStatus;
use App\Enums\PaymentSubmissionStatus;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

final class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'student_id',
        'course_id',
        'enrolment_id',
        'amount',
        'amount_paid',
        'currency',
        'status',
        'payment_method',
        'provider_ref',
        'paid_at',
    ];

    protected $casts = [
        'status' => OrderStatus::class,
        'amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'paid_at' => 'datetime',
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
     * @return BelongsTo<Enrolment, $this>
     */
    public function enrolment(): BelongsTo
    {
        return $this->belongsTo(Enrolment::class);
    }

    /**
     * @return HasMany<PaymentSubmission, $this>
     */
    public function paymentSubmissions(): HasMany
    {
        return $this->hasMany(PaymentSubmission::class)->latest('id');
    }

    /**
     * At most one should ever exist at a time — `PaymentSubmissionService::submit()` refuses a
     * new submission while one is already pending — `latestOfMany()` is a defensive fallback,
     * not load-bearing.
     *
     * @return HasOne<PaymentSubmission, $this>
     */
    public function pendingPaymentSubmission(): HasOne
    {
        return $this->hasOne(PaymentSubmission::class)->where('status', PaymentSubmissionStatus::Pending)->latestOfMany();
    }

    /**
     * The single source of truth for `status`: it is always derived from comparing amount paid
     * to the order total, never accepted as direct input (`Admin\OrderController::update()`,
     * `PaymentSubmissionService::confirm()`).
     */
    public function deriveStatus(float $amountPaid): OrderStatus
    {
        return match (true) {
            $amountPaid <= 0 => OrderStatus::Pending,
            $amountPaid >= (float) $this->amount => OrderStatus::Paid,
            default => OrderStatus::Partial,
        };
    }
}
