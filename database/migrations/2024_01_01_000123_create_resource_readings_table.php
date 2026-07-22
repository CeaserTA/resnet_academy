<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_readings', function (Blueprint $table): void {
            $table->foreignId('resource_id')->primary()->constrained('resources', indexName: 'fk_rr_resource')->cascadeOnDelete();
            $table->mediumText('content_html');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resource_readings');
    }
};
