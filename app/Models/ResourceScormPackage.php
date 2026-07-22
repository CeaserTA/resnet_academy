<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ScormStandard;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class ResourceScormPackage extends Model
{
    protected $primaryKey = 'resource_id';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'resource_id',
        'package_url',
        'standard',
    ];

    protected $casts = [
        'standard' => ScormStandard::class,
    ];

    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class, 'resource_id');
    }
}
