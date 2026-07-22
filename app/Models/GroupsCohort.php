<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\GroupsCohortFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

final class GroupsCohort extends Model
{
    /** @use HasFactory<GroupsCohortFactory> */
    use HasFactory;

    protected $table = 'groups_cohorts';

    public const UPDATED_AT = null;

    protected $fillable = [
        'course_id',
        'name',
        'description',
    ];

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'group_members', 'group_id', 'student_id')
            ->withPivot('added_at');
    }

    /**
     * @return BelongsToMany<Module, $this>
     */
    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(Module::class, 'module_groups', 'group_id', 'module_id');
    }
}
