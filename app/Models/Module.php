<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ModuleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

final class Module extends Model
{
    /** @use HasFactory<ModuleFactory> */
    use HasFactory;

    use SoftDeletes;

    protected $fillable = [
        'course_id',
        'title',
        'description',
        'order_index',
        'scheduled_start_at',
        'unlock_offset_days',
    ];

    protected $casts = [
        'scheduled_start_at' => 'datetime',
        'unlock_offset_days' => 'integer',
    ];

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * If empty, this module applies to every student in the course (FR-7).
     *
     * @return BelongsToMany<GroupsCohort, $this>
     */
    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(GroupsCohort::class, 'module_groups', 'module_id', 'group_id');
    }

    /**
     * @return HasMany<ModuleItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(ModuleItem::class)->orderBy('order_index');
    }

    /**
     * @return HasMany<\App\Models\Resource, $this>
     */
    public function resources(): HasMany
    {
        return $this->hasMany(Resource::class);
    }

    /**
     * @return HasMany<Assignment, $this>
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class);
    }

    /**
     * @return HasMany<Evaluation, $this>
     */
    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class);
    }
}
