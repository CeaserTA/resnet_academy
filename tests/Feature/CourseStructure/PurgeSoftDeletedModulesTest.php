<?php

declare(strict_types=1);

use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\Resource;

it('permanently deletes modules soft-deleted more than 30 days ago, cascading to their resources', function (): void {
    $module = Module::factory()->create();
    $resource = Resource::factory()->for($module)->reading()->create();
    ModuleItem::create(['module_id' => $module->id, 'item_type' => 'resource', 'item_id' => $resource->id, 'order_index' => 1, 'is_required' => true]);

    $module->delete();
    $module->forceFill(['deleted_at' => now()->subDays(31)])->save();

    $this->artisan('modules:purge-soft-deleted')->assertExitCode(0);

    $this->assertDatabaseMissing('modules', ['id' => $module->id]);
    $this->assertDatabaseMissing('resources', ['id' => $resource->id]);
    $this->assertDatabaseMissing('module_items', ['module_id' => $module->id]);
});

it('leaves modules soft-deleted less than 30 days ago untouched', function (): void {
    $module = Module::factory()->create();
    $module->delete();
    $module->forceFill(['deleted_at' => now()->subDays(10)])->save();

    $this->artisan('modules:purge-soft-deleted')->assertExitCode(0);

    $this->assertSoftDeleted('modules', ['id' => $module->id]);
});
