<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('groups_cohorts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained('courses', indexName: 'fk_group_course')->cascadeOnDelete();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('groups_cohorts');
    }
};
