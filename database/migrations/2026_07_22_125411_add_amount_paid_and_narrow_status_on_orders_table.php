<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Partial-payment tracking: `amount_paid` tracks what's been paid so far against `amount` (the
 * full price); `status` narrows to pending/partial/paid, computed server-side from the two
 * (`Admin\OrderController::update()`) rather than set directly. `failed`/`refunded` are dropped
 * — `failed` was never used outside the enum definition, and `refunded` only backed the "void"
 * action, which is removed along with it (financial records aren't hard-deleted, and there's no
 * replacement concept for a refund in this pass). Any pre-existing rows using either are
 * normalized to `pending` first so this is safe even against real data, though none is expected
 * in dev.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->decimal('amount_paid', 10, 2)->default(0)->after('amount');
        });

        DB::table('orders')->whereIn('status', ['failed', 'refunded'])->update(['status' => 'pending']);

        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('pending','partial','paid') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending'");

        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn('amount_paid');
        });
    }
};
