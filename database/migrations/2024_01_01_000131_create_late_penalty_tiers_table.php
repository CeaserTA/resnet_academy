<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('late_penalty_tiers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('policy_id')->constrained('late_penalty_policies', indexName: 'fk_lpt_policy')->cascadeOnDelete();
            $table->unsignedInteger('hours_late_from');
            $table->unsignedInteger('hours_late_to')->nullable()->comment('NULL = unbounded (e.g. 48h+)');
            $table->decimal('penalty_percent', 5, 2);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('late_penalty_tiers');
    }
};
