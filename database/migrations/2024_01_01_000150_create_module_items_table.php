<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('module_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('module_id')->constrained('modules', indexName: 'fk_mi_module')->cascadeOnDelete();
            $table->enum('item_type', ['resource', 'assignment', 'evaluation']);
            $table->unsignedBigInteger('item_id')->comment('FK into resources/assignments/evaluations depending on item_type');
            $table->unsignedInteger('order_index')->default(0);
            $table->boolean('is_required')->default(true)->comment('FALSE = optional supplementary material, does not block module completion');
            $table->unique(['item_type', 'item_id'], 'uq_module_item');
            $table->index(['module_id', 'order_index'], 'idx_module_items_module');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('module_items');
    }
};
