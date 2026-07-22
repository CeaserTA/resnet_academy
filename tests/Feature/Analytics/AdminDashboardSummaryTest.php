<?php

declare(strict_types=1);

use App\Enums\CourseStatus;
use App\Enums\EnrolmentSource;
use App\Enums\OrderStatus;
use App\Enums\TicketStatus;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Order;
use App\Models\Ticket;
use App\Models\User;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Support\Facades\Bus;

beforeEach(function (): void {
    Bus::fake();
});

it('summarizes system-wide counts for the admin dashboard', function (): void {
    $admin = User::factory()->admin()->create();
    User::factory()->instructor()->count(2)->create();
    User::factory()->student()->count(3)->create();

    Course::factory()->create(['status' => CourseStatus::Draft]);
    $ugxCourse = Course::factory()->create(['price' => '100000.00', 'currency' => 'UGX']);
    $usdCourse = Course::factory()->create(['price' => '50.00', 'currency' => 'USD']);

    $paidStudent = User::factory()->student()->create();
    $enrolmentService = app(EnrolmentService::class);
    $enrolmentService->enrol($paidStudent, $ugxCourse, EnrolmentSource::Self);
    Order::where('course_id', $ugxCourse->id)->update(['status' => OrderStatus::Paid]);

    $otherPaidStudent = User::factory()->student()->create();
    $enrolmentService->enrol($otherPaidStudent, $usdCourse, EnrolmentSource::Self);
    Order::where('course_id', $usdCourse->id)->update(['status' => OrderStatus::Paid]);

    Certificate::factory()->for($paidStudent, 'student')->for($ugxCourse)->create();

    Ticket::factory()->create(['student_id' => $paidStudent->id, 'status' => TicketStatus::Open]);
    Ticket::factory()->create(['student_id' => $otherPaidStudent->id, 'status' => TicketStatus::Resolved]);

    $response = $this->actingAs($admin)->getJson('/api/v1/admin/dashboard-summary');

    $response->assertOk();
    $response->assertJsonPath('data.students', 5);
    $response->assertJsonPath('data.instructors', 2);
    $response->assertJsonPath('data.courses_by_status.published', 2);
    $response->assertJsonPath('data.courses_by_status.draft', 1);
    $response->assertJsonPath('data.confirmed_enrolments', 2);
    $response->assertJsonPath('data.certificates_issued', 1);
    $response->assertJsonPath('data.open_tickets', 1);

    // json_encode drops the trailing .0 on a whole-number float, so decoding gives an int here.
    $revenueByCurrency = collect($response->json('data.revenue_by_currency'))->keyBy('currency');
    expect($revenueByCurrency->get('UGX')['total'])->toBe(100000);
    expect($revenueByCurrency->get('USD')['total'])->toBe(50);
});

it('denies a non-admin from viewing the dashboard summary', function (): void {
    $instructor = User::factory()->instructor()->create();
    $student = User::factory()->student()->create();

    $this->actingAs($instructor)->getJson('/api/v1/admin/dashboard-summary')->assertForbidden();
    $this->actingAs($student)->getJson('/api/v1/admin/dashboard-summary')->assertForbidden();
});
