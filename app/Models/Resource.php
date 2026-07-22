<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ResourceType;
use Database\Factories\ResourceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

final class Resource extends Model
{
    /** @use HasFactory<ResourceFactory> */
    use HasFactory;

    protected $fillable = [
        'module_id',
        'type',
        'title',
        'description',
    ];

    protected $casts = [
        'type' => ResourceType::class,
    ];

    /**
     * @return BelongsTo<Module, $this>
     */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    /**
     * @return HasOne<ResourceVideo, $this>
     */
    public function video(): HasOne
    {
        return $this->hasOne(ResourceVideo::class);
    }

    /**
     * @return HasOne<ResourceDocument, $this>
     */
    public function document(): HasOne
    {
        return $this->hasOne(ResourceDocument::class);
    }

    /**
     * @return HasOne<ResourceReading, $this>
     */
    public function reading(): HasOne
    {
        return $this->hasOne(ResourceReading::class);
    }

    /**
     * @return HasOne<ResourceExternalLink, $this>
     */
    public function externalLink(): HasOne
    {
        return $this->hasOne(ResourceExternalLink::class);
    }

    /**
     * @return HasOne<ResourceScormPackage, $this>
     */
    public function scormPackage(): HasOne
    {
        return $this->hasOne(ResourceScormPackage::class);
    }

    /**
     * @return HasOne<ResourceLiveSession, $this>
     */
    public function liveSession(): HasOne
    {
        return $this->hasOne(ResourceLiveSession::class);
    }

    /**
     * @return HasOne<ResourceDownloadableFile, $this>
     */
    public function downloadableFile(): HasOne
    {
        return $this->hasOne(ResourceDownloadableFile::class);
    }

    /**
     * @return HasMany<LiveSessionAttendance, $this>
     */
    public function attendance(): HasMany
    {
        return $this->hasMany(LiveSessionAttendance::class);
    }
}
