<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ModuleProgressStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class ModuleProgress extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'student_id',
        'module_id',
        'status',
        'unlocked_at',
        'completed_at',
    ];

    protected $casts = [
        'status' => ModuleProgressStatus::class,
        'unlocked_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * @return BelongsTo<Module, $this>
     */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }
}
