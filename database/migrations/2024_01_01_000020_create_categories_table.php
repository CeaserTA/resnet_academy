<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 140);
            $table->foreignId('parent_id')->nullable()->constrained('categories', indexName: 'fk_categories_parent')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->unique('slug', 'uq_categories_slug');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
