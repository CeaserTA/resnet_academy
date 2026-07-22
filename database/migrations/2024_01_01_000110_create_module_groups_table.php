<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * If a module has no rows here, it applies to every student in the course (FR-7).
     */
    public function up(): void
    {
        Schema::create('module_groups', function (Blueprint $table): void {
            $table->foreignId('module_id')->constrained('modules', indexName: 'fk_mg_module')->cascadeOnDelete();
            $table->foreignId('group_id')->constrained('groups_cohorts', indexName: 'fk_mg_group')->cascadeOnDelete();
            $table->primary(['module_id', 'group_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('module_groups');
    }
};
