<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CourseLevel;
use App\Enums\CourseStatus;
use Database\Factories\CourseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Course extends Model
{
    /** @use HasFactory<CourseFactory> */
    use HasFactory;

    protected $fillable = [
        'category_id',
        'title',
        'slug',
        'description',
        'level',
        'thumbnail_url',
        'prerequisites_text',
        'price',
        'currency',
        'status',
        'current_version',
        'confirmation_delay_hours',
        'schedule_start_date',
        'created_by',
    ];

    protected $casts = [
        'level' => CourseLevel::class,
        'status' => CourseStatus::class,
        'price' => 'decimal:2',
        'schedule_start_date' => 'date',
    ];

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function instructors(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'course_instructors', 'course_id', 'instructor_id')
            ->withPivot('is_primary', 'assigned_at');
    }

    /**
     * @return HasMany<CourseChangeLog, $this>
     */
    public function changeLogs(): HasMany
    {
        return $this->hasMany(CourseChangeLog::class);
    }

    /**
     * @return HasMany<Enrolment, $this>
     */
    public function enrolments(): HasMany
    {
        return $this->hasMany(Enrolment::class);
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * @return HasMany<Module, $this>
     */
    public function modules(): HasMany
    {
        return $this->hasMany(Module::class)->orderBy('order_index');
    }

    /**
     * @return HasMany<GroupsCohort, $this>
     */
    public function groups(): HasMany
    {
        return $this->hasMany(GroupsCohort::class, 'course_id');
    }

    /**
     * @return HasMany<QuestionBank, $this>
     */
    public function questionBanks(): HasMany
    {
        return $this->hasMany(QuestionBank::class);
    }

    /**
     * @return HasMany<Announcement, $this>
     */
    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class);
    }

    /**
     * @return HasMany<Ticket, $this>
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    /**
     * Shared "can this instructor manage this course" check, reused by every Phase 2 policy
     * (Module/GroupsCohort/Resource/ModuleItem) alongside admin's blanket access.
     */
    public function isTaughtBy(User $user): bool
    {
        return $this->instructors()->where('users.id', $user->id)->exists();
    }
}
