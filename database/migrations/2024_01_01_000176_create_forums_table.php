<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('forums', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained('courses', indexName: 'fk_forum_course')->cascadeOnDelete();
            $table->string('title', 200)->default('General Discussion');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forums');
    }
};
