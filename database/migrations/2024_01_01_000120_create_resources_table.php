<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resources', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('module_id')->constrained('modules', indexName: 'fk_resources_module')->cascadeOnDelete();
            $table->enum('type', ['video', 'document', 'reading', 'external_link', 'scorm', 'live_session', 'downloadable_file']);
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resources');
    }
};
