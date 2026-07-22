<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_scorm_packages', function (Blueprint $table): void {
            $table->foreignId('resource_id')->primary()->constrained('resources', indexName: 'fk_rsp_resource')->cascadeOnDelete();
            $table->string('package_url', 500);
            $table->enum('standard', ['scorm_1_2', 'scorm_2004', 'xapi']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resource_scorm_packages');
    }
};
