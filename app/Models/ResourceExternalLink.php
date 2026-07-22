<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class ResourceExternalLink extends Model
{
    protected $primaryKey = 'resource_id';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'resource_id',
        'url',
    ];

    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class, 'resource_id');
    }
}
