<?php

declare(strict_types=1);

use App\Models\Cohort;
use App\Models\User;
use App\Services\Enrolment\CohortService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->cohortService = app(CohortService::class);
});

describe('CohortService', function (): void {
    describe('atomicity', function (): void {
        it('rolls back the cohort if the audit log write fails during create()', function (): void {
            $admin = User::factory()->admin()->create();

            // Simulate a failure on the audit-log write, which happens right after the cohort
            // row is created — the cohort must not survive without an audit trail.
            DB::beforeExecuting(function (string $query): void {
                if (str_contains($query, 'insert into `audit_logs`')) {
                    throw new RuntimeException('Simulated failure for atomicity test');
                }
            });

            expect(fn () => $this->cohortService->create([
                'name' => 'Rollback Test Intake',
                'start_date' => now()->addMonth(),
                'end_date' => now()->addMonths(4),
            ], $admin->id))->toThrow(RuntimeException::class);

            expect(Cohort::where('name', 'Rollback Test Intake')->exists())->toBeFalse();
        });

        it('rolls back the field update if the audit log write fails during update()', function (): void {
            $admin = User::factory()->admin()->create();
            $cohort = Cohort::factory()->create(['name' => 'Original Name']);

            DB::beforeExecuting(function (string $query): void {
                if (str_contains($query, 'insert into `audit_logs`')) {
                    throw new RuntimeException('Simulated failure for atomicity test');
                }
            });

            expect(fn () => $this->cohortService->update($cohort, ['name' => 'Changed Name'], $admin->id))
                ->toThrow(RuntimeException::class);

            expect($cohort->fresh()->name)->toBe('Original Name');
        });
    });
});
