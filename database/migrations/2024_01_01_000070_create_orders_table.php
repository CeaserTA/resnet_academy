<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained('users', indexName: 'fk_orders_student')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses', indexName: 'fk_orders_course')->cascadeOnDelete();
            $table->foreignId('enrolment_id')->nullable()->constrained('enrolments', indexName: 'fk_orders_enrolment')->nullOnDelete();
            $table->decimal('amount', 10, 2);
            $table->char('currency', 3)->default('UGX');
            $table->enum('status', ['pending', 'paid', 'failed', 'refunded'])->default('pending');
            $table->string('payment_method', 50)->nullable();
            $table->string('provider_ref', 150)->nullable()->comment('External gateway transaction reference');
            $table->dateTime('paid_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('student_id', 'idx_orders_student');
            $table->index('course_id', 'idx_orders_course');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
