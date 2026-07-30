<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('first_name', 75)->nullable()->after('name');
            $table->string('last_name', 75)->nullable()->after('first_name');
            $table->text('bio')->nullable()->after('avatar_url');
            $table->string('country', 100)->nullable()->after('bio');
            $table->string('city', 100)->nullable()->after('country');
            $table->string('postal_code', 20)->nullable()->after('city');
            $table->string('tax_id', 50)->nullable()->after('postal_code');
            $table->string('facebook_url', 255)->nullable()->after('tax_id');
            $table->string('twitter_url', 255)->nullable()->after('facebook_url');
            $table->string('linkedin_url', 255)->nullable()->after('twitter_url');
            $table->string('instagram_url', 255)->nullable()->after('linkedin_url');
        });

        // Best-effort backfill so the new profile-edit form isn't blank for existing accounts —
        // `name` itself is left untouched and stays the source of truth everywhere else in the
        // app; first/last are just a convenience split for this one form.
        DB::table('users')->orderBy('id')->chunkById(200, function ($users): void {
            foreach ($users as $user) {
                $trimmed = trim((string) $user->name);
                $spacePosition = strpos($trimmed, ' ');

                $firstName = $spacePosition === false ? $trimmed : substr($trimmed, 0, $spacePosition);
                $lastName = $spacePosition === false ? '' : trim(substr($trimmed, $spacePosition + 1));

                DB::table('users')->where('id', $user->id)->update([
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'first_name',
                'last_name',
                'bio',
                'country',
                'city',
                'postal_code',
                'tax_id',
                'facebook_url',
                'twitter_url',
                'linkedin_url',
                'instagram_url',
            ]);
        });
    }
};
