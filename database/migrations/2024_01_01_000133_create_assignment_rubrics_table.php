<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignment_rubrics', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('assignment_id')->constrained('assignments', indexName: 'fk_rubric_assignment')->cascadeOnDelete();
            $table->string('criterion', 200);
            $table->decimal('max_points', 6, 2);
            $table->unsignedInteger('order_index')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignment_rubrics');
    }
};
