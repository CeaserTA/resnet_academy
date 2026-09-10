<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add transfer-related fields to enrolments table for withdraw-after-payment flow.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enrolments', function (Blueprint $table) {
            $table->unsignedBigInteger('transferred_to_id')->nullable()
                ->after('confirmation_email_sent_at');
            $table->foreign('transferred_to_id')
                ->references('id')
                ->on('enrolments')
                ->nullOnDelete();

            $table->timestamp('transfer_requested_at')->nullable()
                ->after('transferred_to_id');

            $table->text('withdrawal_note')->nullable()
                ->after('transfer_requested_at');
        });
    }

    public function down(): void
    {
        Schema::table('enrolments', function (Blueprint $table) {
            $table->dropForeign(['transferred_to_id']);
            $table->dropColumn(['transferred_to_id', 'transfer_requested_at', 'withdrawal_note']);
        });
    }
};
