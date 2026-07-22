<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\DocumentFileType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class ResourceDocument extends Model
{
    protected $primaryKey = 'resource_id';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'resource_id',
        'file_url',
        'file_type',
        'file_size_kb',
    ];

    protected $casts = [
        'file_type' => DocumentFileType::class,
    ];

    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class, 'resource_id');
    }
}
