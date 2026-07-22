<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_progress', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained('users', indexName: 'fk_rp_student')->cascadeOnDelete();
            $table->foreignId('resource_id')->constrained('resources', indexName: 'fk_rp_resource')->cascadeOnDelete();
            $table->enum('status', ['not_started', 'in_progress', 'completed'])->default('not_started');
            $table->decimal('watch_percent', 5, 2)->nullable()->comment('Video: completed at >= 90');
            $table->dateTime('marked_read_at')->nullable()->comment('Document/reading: "Mark as read" click');
            $table->dateTime('opened_at')->nullable()->comment('External link: marked opened on click');
            $table->dateTime('completed_at')->nullable();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->unique(['student_id', 'resource_id'], 'uq_resource_progress');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resource_progress');
    }
};
