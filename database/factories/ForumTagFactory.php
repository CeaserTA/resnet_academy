<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ForumTag;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ForumTag>
 */
final class ForumTagFactory extends Factory
{
    protected $model = ForumTag::class;

    public function definition(): array
    {
        $name = fake()->unique()->word();

        return [
            'name' => $name,
            'slug' => Str::slug($name),
        ];
    }
}
