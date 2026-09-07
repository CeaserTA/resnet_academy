<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add refund and transfer fields to orders table for withdraw-after-payment flow.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('refunded_amount', 10, 2)->nullable()
                ->after('paid_at');
            $table->timestamp('refunded_at')->nullable()
                ->after('refunded_amount');
            $table->unsignedBigInteger('refunded_by')->nullable()
                ->after('refunded_at');
            $table->foreign('refunded_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
            $table->unsignedBigInteger('transferred_from_enrolment_id')->nullable()
                ->after('refunded_by');
            $table->foreign('transferred_from_enrolment_id')
                ->references('id')
                ->on('enrolments')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['refunded_by']);
            $table->dropForeign(['transferred_from_enrolment_id']);
            $table->dropColumn(['refunded_amount', 'refunded_at', 'refunded_by', 'transferred_from_enrolment_id']);
        });
    }
};
