<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificates', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained('users', indexName: 'fk_cert_student')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses', indexName: 'fk_cert_course')->cascadeOnDelete();
            $table->string('certificate_number', 60);
            $table->string('certificate_url', 500)->nullable();
            $table->timestamp('issued_at')->useCurrent();
            $table->unique('certificate_number', 'uq_certificate_number');
            $table->unique(['student_id', 'course_id'], 'uq_certificate_student_course');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificates');
    }
};
