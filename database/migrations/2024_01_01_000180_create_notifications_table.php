<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users', indexName: 'fk_notification_user')->cascadeOnDelete();
            $table->enum('channel', ['in_app', 'email', 'sms', 'push'])->default('in_app');
            $table->string('type', 60)->comment('e.g. enrolment_confirmed, assignment_due_soon, grade_posted, forum_reply, module_unlocked');
            $table->string('title', 200);
            $table->text('body')->nullable();
            $table->string('related_entity_type', 60)->nullable();
            $table->unsignedBigInteger('related_entity_id')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'is_read'], 'idx_notifications_user');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
