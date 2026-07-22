<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ForumPostReportStatus;
use App\Models\ForumPost;
use App\Models\ForumPostReport;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ForumPostReport>
 */
final class ForumPostReportFactory extends Factory
{
    protected $model = ForumPostReport::class;

    public function definition(): array
    {
        return [
            'post_id' => ForumPost::factory(),
            'reported_by' => User::factory(),
            'reason' => fake()->sentence(4),
            'status' => ForumPostReportStatus::Pending,
        ];
    }
}
