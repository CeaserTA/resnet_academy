<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OAuthProvider;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class OauthAccount extends Model
{
    protected $table = 'oauth_accounts';

    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'provider',
        'provider_user_id',
    ];

    protected $casts = [
        'provider' => OAuthProvider::class,
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
