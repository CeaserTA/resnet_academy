<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_external_links', function (Blueprint $table): void {
            $table->foreignId('resource_id')->primary()->constrained('resources', indexName: 'fk_rel_resource')->cascadeOnDelete();
            $table->string('url', 500);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resource_external_links');
    }
};
