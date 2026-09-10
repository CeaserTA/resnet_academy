<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * `groups_cohorts` is a per-course student sub-group for module-visibility gating (FR-7) —
 * unrelated to the real intake-level Cohort introduced alongside this migration. Renaming
 * it here to remove the naming collision. FK constraints on group_members/module_groups
 * follow the rename automatically.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('groups_cohorts', 'groups');
    }

    public function down(): void
    {
        Schema::rename('groups', 'groups_cohorts');
    }
};
