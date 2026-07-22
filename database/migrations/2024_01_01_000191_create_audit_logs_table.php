<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('actor_id')->nullable()->comment('NULL for system/automated actions (e.g. scheduled jobs)')->constrained('users', indexName: 'fk_audit_actor')->nullOnDelete();
            $table->string('action', 100)->comment('e.g. enrolment.confirmed, grade.changed, user.suspended');
            $table->string('entity_type', 60);
            $table->unsignedBigInteger('entity_id');
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['entity_type', 'entity_id'], 'idx_audit_entity');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
