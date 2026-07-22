<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_submissions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained('orders', indexName: 'fk_payment_submission_order')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('receipt_path', 255);
            $table->string('receipt_original_name', 255)->nullable();
            $table->enum('status', ['pending', 'confirmed', 'rejected'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users', indexName: 'fk_payment_submission_reviewer')->nullOnDelete();
            $table->dateTime('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_submissions');
    }
};
