<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\LiveSessionProvider;
use App\Enums\ResourceType;
use App\Models\Module;
use App\Models\Resource;
use App\Models\ResourceDocument;
use App\Models\ResourceExternalLink;
use App\Models\ResourceLiveSession;
use App\Models\ResourceReading;
use App\Models\ResourceVideo;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Resource>
 */
final class ResourceFactory extends Factory
{
    protected $model = Resource::class;

    public function definition(): array
    {
        return [
            'module_id' => Module::factory(),
            'type' => ResourceType::Reading,
            'title' => fake()->unique()->sentence(4),
            'description' => fake()->sentence(),
        ];
    }

    public function video(): static
    {
        return $this->state(['type' => ResourceType::Video])->afterCreating(function (Resource $resource): void {
            ResourceVideo::create([
                'resource_id' => $resource->id,
                'bunny_stream_video_id' => fake()->uuid(),
                'duration_seconds' => 600,
            ]);
        });
    }

    public function document(): static
    {
        return $this->state(['type' => ResourceType::Document])->afterCreating(function (Resource $resource): void {
            ResourceDocument::create([
                'resource_id' => $resource->id,
                'file_url' => fake()->url(),
                'file_type' => 'pdf',
            ]);
        });
    }

    public function reading(): static
    {
        return $this->state(['type' => ResourceType::Reading])->afterCreating(function (Resource $resource): void {
            ResourceReading::create([
                'resource_id' => $resource->id,
                'content_html' => '<p>'.fake()->paragraph().'</p>',
            ]);
        });
    }

    public function externalLink(): static
    {
        return $this->state(['type' => ResourceType::ExternalLink])->afterCreating(function (Resource $resource): void {
            ResourceExternalLink::create([
                'resource_id' => $resource->id,
                'url' => fake()->url(),
            ]);
        });
    }

    public function liveSession(): static
    {
        return $this->state(['type' => ResourceType::LiveSession])->afterCreating(function (Resource $resource): void {
            ResourceLiveSession::create([
                'resource_id' => $resource->id,
                'provider' => LiveSessionProvider::Zoom,
                'meeting_url' => fake()->url(),
                'scheduled_at' => now()->addDay(),
                'duration_minutes' => 60,
            ]);
        });
    }
}
