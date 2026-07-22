<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_members', function (Blueprint $table): void {
            $table->foreignId('group_id')->constrained('groups_cohorts', indexName: 'fk_gm_group')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users', indexName: 'fk_gm_student')->cascadeOnDelete();
            $table->timestamp('added_at')->useCurrent();
            $table->primary(['group_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_members');
    }
};
