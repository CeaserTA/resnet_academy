<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Notifications\VerifyEmailQueued;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

final class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'role',
        'name',
        'first_name',
        'last_name',
        'email',
        'password_hash',
        'phone',
        'avatar_url',
        'bio',
        'country',
        'city',
        'postal_code',
        'tax_id',
        'status',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected $casts = [
        'role' => UserRole::class,
        'status' => UserStatus::class,
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'password_hash' => 'hashed',
    ];

    /**
     * schema.sql stores the password hash in `password_hash`, not Laravel's default `password`.
     */
    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    /**
     * Queued (see `VerifyEmailQueued`) so a mail failure can't 500 the registration request —
     * the `User` row is already committed by the time this fires.
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailQueued);
    }

    public function oauthAccounts(): HasMany
    {
        return $this->hasMany(OauthAccount::class);
    }

    public function enrolments(): HasMany
    {
        return $this->hasMany(Enrolment::class, 'student_id');
    }

    public function coursesCreated(): HasMany
    {
        return $this->hasMany(Course::class, 'created_by');
    }

    public function coursesTaught(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'course_instructors', 'instructor_id', 'course_id')
            ->withPivot('is_primary', 'assigned_at');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'student_id');
    }
}
