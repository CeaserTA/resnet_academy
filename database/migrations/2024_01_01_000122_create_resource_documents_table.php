<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_documents', function (Blueprint $table): void {
            $table->foreignId('resource_id')->primary()->constrained('resources', indexName: 'fk_rd_resource')->cascadeOnDelete();
            $table->string('file_url', 500);
            $table->enum('file_type', ['pdf', 'pptx', 'docx']);
            $table->unsignedInteger('file_size_kb')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resource_documents');
    }
};
